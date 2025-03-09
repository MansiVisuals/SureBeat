-- SureBeat by MansiVisuals

-- 1. Dependencies, Constants, and Globals

local server_url = "https://activate.mansivisuals.com"
local update_server_url = "https://update.mansivisuals.com"
local mac_uid = ""
local script_path = debug.getinfo(1, "S").source:match("@?(.*/)")
local temp_folder_path = script_path .. "tmp/"
local license_key_path = temp_folder_path .. "activation.key"
local settings_file_path = temp_folder_path .. "user_settings.json"
local temp_file_path = temp_folder_path .. "analysis_cache.json"
local surebeat_binary = script_path .. "SureBeat"
local is_trial_mode = false
local trial_days_remaining = nil
local license_verified = false
local user_cancelled = false
local api_key = "9boChvISunRQvGG63Kz7jVfpwTT24X+7MMf5KovHFnE="
local save_analysis = true
local json = require("dkjson") 
local excluded_tracks = ""
local filter_duplicates = false 
local enable_pattern = true 
local beats_per_bar = 4
local add_markers_to_duplicates = false 
local beat_color = "Purple" 
local tempo_color = "Blue"
local CURRENT_VERSION = "v3.1.1"

-- Create temp directory at startup
os.execute("mkdir -p \"" .. temp_folder_path .. "\"")

-- Function to execute a cURL command and return the response
function execute_curl(url, data)
    local command = string.format([[curl -s -X POST "%s" -H "Content-Type: application/json" -H "x-api-key: %s" -d '%s']], url, api_key, data)
    local handle = io.popen(command)
    local result = handle:read("*a")
    handle:close()
    return result
end

-- Function to extract remaining days from the server response message
function extract_remaining_days(message)
    local days = message:match("(%d+) days remaining")
    return tonumber(days) or 0
end

-- 2. License & Activation Functions
-- Function to validate the license or trial with the server
function validate_with_server(license_key)
    print("[SureBeat] Validating license with server...")
    local endpoint = "/validate"
    local request_body = string.format('{"licenseKey": "%s", "macUid": "%s"}', license_key, mac_uid)
    local response = execute_curl(server_url .. endpoint, request_body)

    if response and response ~= "" then
        local success = response:match('"status":"success"')
        local message = response:match('"message":"(.-)"') or "Unknown error"
        local remaining_days = extract_remaining_days(message)
        return success ~= nil, message, remaining_days
    else
        print("[SureBeat] Server validation failed. No response received.")
        return false, "Unable to connect to the server.", 0
    end
end

-- Function to activate a trial
function activate_trial()
    print("[SureBeat] Activating trial...")
    local endpoint = "/activate-license"
    local request_body = string.format('{"licenseKey": "trial", "macUid": "%s"}', mac_uid)
    local response = execute_curl(server_url .. endpoint, request_body)

    if response and response ~= "" then
        local success = response:match('"status":"success"')
        local message = response:match('"message":"(.-)"') or "Unknown error"
        local remaining_days = extract_remaining_days(message)
        return success ~= nil, message, remaining_days
    else
        return false, "Unable to connect to the server.", 0
    end
end

function activate_license(license_key, mac_uid)
    local endpoint = "/activate-license"
    local url = server_url .. endpoint
    local request_body = string.format('{"licenseKey": "%s", "macUid": "%s"}', license_key, mac_uid)

    -- Execute the cURL command
    local response = execute_curl(url, request_body)

    -- Parse the server response
    if response and response ~= "" then
        local success = response:match('"status":"success"')
        local message = response:match('"message":"(.-)"') or "Unknown error"

        if success then
            print("[SureBeat] License activation successful.") -- Essential information
            return true, message
        else
            print("[SureBeat] License activation failed: " .. message) -- Essential error information
            return false, message
        end
    else
        print("[SureBeat] License activation failed: Unable to connect to the server.") -- Network failure notice
        return false, "Unable to connect to the server."
    end
end

-- Function to deactivate a license
function deactivate_license(license_key, mac_uid)
    local endpoint = "/deactivate-license"
    local url = server_url .. endpoint
    local request_body = string.format('{"licenseKey": "%s", "macUid": "%s"}', license_key, mac_uid)

    print("[SureBeat] Attempting to deactivate license...")
    local response = execute_curl(url, request_body)

    if response and response ~= "" then
        local success = response:match('"status":"success"')
        local message = response:match('"message":"(.-)"') or "Unknown error"

        if success then
            print("[SureBeat] License deactivation successful.")
            -- Remove the stored license key
            os.remove(license_key_path)
            return true, message
        else
            print("[SureBeat] License deactivation failed: " .. message)
            return false, message
        end
    else
        print("[SureBeat] License deactivation failed: Unable to connect to the server.")
        return false, "Unable to connect to the server."
    end
end

-- Function to display a confirmation dialog for deactivation
function open_deactivation_dialog(disp, license_key)
    local ui = fu.UIManager
    
    local deact_win = disp:AddWindow({
        ID = "DeactivationDialog",
        WindowTitle = "Deactivate SureBeat License",
        Geometry = {100, 100, 400, 200},
        ui:VGroup{
            ID = "root",
            ui:Label{
                Text = "<b>Deactivate License</b>", 
                Alignment = {AlignHCenter = true}, 
                StyleSheet = "font-size: 16px; color: white;"
            },
            ui:Label{
                Text = "Are you sure you want to deactivate your SureBeat license \non this device?",
                Alignment = {AlignHCenter = true},
                StyleSheet = "font-size: 12px; color: white; padding: 10px;"
            },
            ui:Label{
                Text = "This will allow you to use the license on another device.",
                Alignment = {AlignHCenter = true},
                StyleSheet = "font-size: 12px; color: white; padding-bottom: 20px;"
            },
            ui:HGroup{
                ui:Button{ID = "Confirm", Text = "Yes, Deactivate"},
                ui:Button{ID = "Cancel", Text = "Cancel"},
            },
        }
    })

    local deactivation_confirmed = false
    
    function deact_win.On.Confirm.Clicked()
        -- Get current MAC UID if not provided
        if not mac_uid or mac_uid == "" then
            mac_uid = get_mac_uid()
        end
        
        local success, message = deactivate_license(license_key, mac_uid)
        if success then
            -- Reset license state
            license_verified = false
            is_trial_mode = false
            
            -- Log success and prepare for restart
            print("[SureBeat] License successfully deactivated: " .. message)
            print("[SureBeat] Restarting SureBeat...")
            
            -- Close the deactivation window first
            deact_win:Hide()
            
            -- Find all windows and close them - similar to update restart logic
            -- This is important since we might have various windows open
            
            -- If advanced settings window is open (parent window of deactivation)
            -- Get the parent window reference from advanced_settings function
            local advanced_win = _G.advanced_win
            if advanced_win then
                advanced_win:Hide()
            end
            
            -- If main application window is open (might be passed as win parameter)
            -- This parameter is passed in from the advanced_settings function
            if _G.main_app_win then
                _G.main_app_win:Hide()
            end
            
            -- Exit all UI loops
            disp:ExitLoop()
            
            -- Use loadfile approach to launch the new SureBeat_main.luac
            local compiledScriptPath = script_path .. "SureBeat_main.luac"
            print("[SureBeat] Reloading SureBeat from: " .. compiledScriptPath)
            
            -- Attempt to load and execute the compiled file
            local mainFunc, loadError = loadfile(compiledScriptPath)
            
            -- Check if the file loaded successfully
            if mainFunc then
                print("[SureBeat] SureBeat loaded successfully. Restarting...")
                mainFunc()  -- Execute the compiled script
            else
                print("[SureBeat] Error loading SureBeat: " .. (loadError or "Unknown error"))
            end
            
            -- Force immediate termination of this script if we somehow get here
            os.exit(0)
        else
            -- Show error message
            deact_win:GetItems().root:AddChild(
                ui:Label{
                    Text = "Error: " .. message,
                    Alignment = {AlignHCenter = true},
                    StyleSheet = "font-size: 12px; color: #ff5555; padding: 10px;"
                }
            )
        end
    end

    function deact_win.On.Cancel.Clicked()
        deact_win:Hide()
        disp:ExitLoop()
    end

    deact_win:Show()
    disp:RunLoop()
    
    return deactivation_confirmed
end

-- Function to read the license key from file
function read_license_key()
    local file = io.open(license_key_path, "r")
    if file then
        local key = file:read("*a"):gsub("%s+", "")
        file:close()
        return key
    else
        return nil
    end
end

-- Function to save the license key to a file
function save_license_key(license_key)
        local file = io.open(license_key_path, "w")
    if file then
        file:write(license_key)
        file:close()
    end
end

function get_mac_uid()
    -- Simple local MD5 helper
    local function md5sum(data)
        local pipe = io.popen("echo -n '" .. data .. "' | md5")
        local result = pipe:read("*a"):gsub("%s+", "")
        pipe:close()
        return result
    end

    -- Get UUID from IOPlatformExpertDevice
    local handle = io.popen([[ioreg -c IOPlatformExpertDevice -d 2 | awk -F\" '/IOPlatformUUID/ {print $4}' 2>/dev/null]])
    local platformUUID = handle:read("*a"):gsub("%s+", "")
    handle:close()

    if platformUUID == "" then
        platformUUID = "unknown"
    end

    -- Hash the UUID and reshape into a mock MAC
    local hash = md5sum(platformUUID)
    local macParts = {}
    for i = 0, 5 do
        table.insert(macParts, hash:sub(i * 2 + 1, i * 2 + 2))
    end

    return table.concat(macParts, ":")
end

-- Main function to handle activation flow
function main()
    mac_uid = get_mac_uid()
    local license_key = read_license_key()

    if license_key then
        print("[SureBeat] DEBUG: License key found. Validating with server...")
        local success, message, remaining_days = validate_with_server(license_key)
        if success then
            print("[SureBeat] DEBUG: Validation successful.")
            license_verified = true
            if license_key == "trial" then
                is_trial_mode = true
                trial_days_remaining = remaining_days
                print("[SureBeat] Trial active. " .. remaining_days .. " days remaining.")
            else
                print("[SureBeat] License validated successfully.")
            end
        else
            print("[SureBeat] DEBUG: Validation failed. Message:", message)
            os.exit(1)
        end
    else
        print("[SureBeat] DEBUG: No license found. Prompting user for activation...")
        print("[SureBeat] Enter 'trial' to activate a trial or provide a valid license key:")
        local input = io.read()
        if input == "trial" then
            print("[SureBeat] DEBUG: Trial activation selected.")
            local success, message, remaining_days = activate_trial()
            if success then
                is_trial_mode = true
                trial_days_remaining = remaining_days
                save_license_key("trial")
                print("[SureBeat] Trial activated. " .. remaining_days .. " days remaining.")
            else
                print("[SureBeat] DEBUG: Trial activation failed. Message:", message)
                os.exit(1)
            end
        else
            print("[SureBeat] DEBUG: Real license activation selected.")
            local success, message = activate_license(input, mac_uid)
            if success then
                save_license_key(input)
                license_verified = true
                print("[SureBeat] License activated successfully.")
            else
                print("[SureBeat] DEBUG: Real license activation failed. Message:", message)
                os.exit(1)
            end
        end
    end
end

-- 3. License Manager UI Functions
-- License Manager UI
function open_license_manager(initial_status, trial_active, trial_remaining)
    local ui = fu.UIManager
    local disp = bmd.UIDispatcher(ui)

    local license_win = disp:AddWindow({
        ID = "LicenseManager",
        WindowTitle = "SureBeat License Manager",
        Geometry = {100, 100, 400, 300}, -- Back to original height
        ui:VGroup{
            ID = "root",
            ui:Label{Text = "<b>Activate SureBeat</b>", Alignment = {AlignHCenter = true}, StyleSheet = "font-size: 16px; color: white;"},
            ui:Label{Text = "Enter your license key or activate a trial.", Alignment = {AlignHCenter = true}, StyleSheet = "font-size: 12px; color: white;"},
            ui:Label{ID = "TrialStatus", Text = initial_status or "", Alignment = {AlignHCenter = true}, StyleSheet = "font-size: 12px; color: yellow;"},
            ui:LineEdit{ID = "LicenseKey", PlaceholderText = "Enter License Key or use 'trial'", Text = "trial"},
            ui:HGroup{
                ui:Button{ID = "Activate", Text = "Activate"},
                ui:Button{ID = "Continue", Text = "Continue", Visible = trial_active and trial_remaining > 0},
                ui:Button{ID = "Cancel", Text = "Cancel"},
            },
            ui:Button{ID = "Buy", Text = "Buy Now"}
        }
    })

    local items = license_win:GetItems()

    function license_win.On.Activate.Clicked()
        local license_key = items.LicenseKey.Text
        local success, message, remaining_days = nil, nil, nil
    
        if license_key == "trial" then
            success, message, remaining_days = activate_trial()
        else
            success, message = activate_license(license_key, mac_uid)
        end
    
        if success then
            if license_key == "trial" then
                is_trial_mode = true
                trial_days_remaining = remaining_days
                items.TrialStatus.Text = "Trial active. " .. remaining_days .. " days remaining."
                items.Continue.Visible = true
                save_license_key("trial")
            else
                license_verified = true
                save_license_key(license_key)
                license_win:Hide()
                disp:ExitLoop()
            end
        else
            items.TrialStatus.Text = "Activation failed: " .. message
            items.Continue.Visible = false
        end
    end

    function license_win.On.Continue.Clicked()
        license_win:Hide()
        disp:ExitLoop()
    end

    function license_win.On.Cancel.Clicked()
        user_cancelled = true
        license_win:Hide()
        disp:ExitLoop()
    end

    license_win.On.Buy.Clicked = function() os.execute('open "https://ko-fi.com/s/2455c69d4d"') end

    -- Note: Removed DeactivateLicense button and event handler since it's not needed here

    license_win:Show()
    disp:RunLoop()
    license_win:Hide()
end

-- Main Function
function main()
    mac_uid = get_mac_uid()

    local license_key = read_license_key()
    local initial_status = "No active trial or license found."
    local trial_active = false

    if license_key then
        local success, message, remaining_days = validate_with_server(license_key)
        if success then
            if license_key == "trial" then
                is_trial_mode = true
                trial_days_remaining = remaining_days
                if trial_days_remaining > 0 then
                    initial_status = "Trial active. " .. remaining_days .. " days remaining."
                    trial_active = true
                else
                    initial_status = "Trial expired. Please purchase a license."
                end
            else
                print("[SureBeat] License validated successfully. Loading SureBeat...")
                return true
            end
        else
            initial_status = message or "Validation failed."
        end
    end

    open_license_manager(initial_status, trial_active, trial_days_remaining)

    if user_cancelled or (not is_trial_mode and not license_verified) then
        print("[SureBeat] SureBeat will not run without a valid trial or license.")
        os.exit()
    end

    return is_trial_mode or license_verified
end

-- Run License Validation and execute the main script if validated
if main() then
    print("[SureBeat] SureBeat: License or trial validated. Initializing main functionality...")

-- 4. Advanced Setting
local marker_colors = {
    "Blue", "Cyan", "Green", "Yellow", "Red", "Pink", "Purple", "Fuchsia",
    "Rose", "Lavender", "Sky", "Mint", "Lemon", "Sand", "Cocoa", "Cream"
}

function restore_default_settings()
    filter_duplicates = false
    save_analysis = true
    enable_pattern = true
    beats_per_bar = 4
    excluded_tracks = ""
    beat_color = "Purple"
    tempo_color = "Blue"
    add_markers_to_duplicates = false 
    os.remove(settings_file_path)
    
    -- Remove this print statement to avoid duplicate logs
    -- print("[SureBeat] Settings restored to defaults")
    
    -- Return true to indicate success
    return true
end

function open_advanced_settings(win, dropdown)
    -- Hide the main window
    win:Hide()

    -- Store main window reference globally
    _G.main_app_win = win
    
    local ui = fu.UIManager
    local disp = bmd.UIDispatcher(ui)
    local settings_changed = false

    local settings_file_exists = false
    local file = io.open(settings_file_path, "r")
    if file then
        file:close()
        settings_file_exists = true
    end

    -- Check if a non-trial license is active
    local license_key = read_license_key()
    -- Make explicitly clear that we only show deactivation for non-trial licenses
    local show_deactivate = license_key and license_key ~= "trial"
    
    local advanced_win = disp:AddWindow({
        ID = "AdvancedSettings",
        WindowTitle = "Advanced Settings",
        Geometry = {100, 100, 400, 520}, -- Make slightly taller
        ui:VGroup{
            ID = "root",
            ui:Label{
                Text = "<b>Advanced Settings</b>",
                Alignment = {AlignHCenter = true},
                StyleSheet = "font-size: 16px; color: white;"
            },
            ui:CheckBox{
                ID = "UnifiedClipActions",
                Text = "Unified Audio Clip Actions\n(Filters duplicates + adds markers to clips with the same audio)",
                Checked = filter_duplicates,
                StyleSheet = "color: white; font-size: 12px;"
            },
            ui:CheckBox{
                ID = "SaveAnalysis",
                Text = "Save Analysis",
                Checked = save_analysis,
                StyleSheet = "color: white; font-size: 12px;"
            },
            ui:CheckBox{
                ID = "EnablePattern",
                Text = "Downbeat Pattern (others white)",
                Checked = enable_pattern,
                StyleSheet = "color: white; font-size: 12px;"
            },
            ui:Label{
                Text = "Beats in Measure (2–12): (Enable Downbeat Pattern to change value)",
                StyleSheet = "font-size: 12px; color: white;",
                Enabled = enable_pattern
            },
            ui:SpinBox{
                ID = "BeatsPerBar",
                Value = beats_per_bar,
                Minimum = 2,
                Maximum = 12,
                StyleSheet = "color: black; background-color: #DEC091;",
                Enabled = enable_pattern
            },
ui:Label{
            Text = "Exclude Tracks (comma-separated):",
                StyleSheet = "color: white; font-size: 12px;"
            },
            ui:LineEdit{
                ID = "ExcludeTracks",
                Text = excluded_tracks,
                PlaceholderText = "e.g., 1,3,5",
                StyleSheet = "color: black; background-color: #DEC091;"
            },
            ui:Label{
                Text = "Choose Tempo Marker Color:",
                StyleSheet = "color: white; font-size: 12px;"
            },
            ui:ComboBox{
                ID = "TempoColorDropdown",
                MinimumSize = {100, 20},
                StyleSheet = "font-size: 12px; color: black; background-color: #DEC091; border-radius: 5px; padding: 5px;"
            },
            ui:Label{
                Text = "Choose Beat Marker Color:",
                StyleSheet = "color: white; font-size: 12px;"
            },
            ui:ComboBox{
                ID = "BeatColorDropdown",
                MinimumSize = {100, 20},
                StyleSheet = "font-size: 12px; color: black; background-color: #DEC091; border-radius: 5px; padding: 5px;"
            },
            ui:HGroup{
                ui:Button{
                    ID = "RemoveCache",
                    Text = "Remove Analysis Cache",
                    StyleSheet = [[
                        QPushButton { background-color: #8B0000; color: white; font-weight: bold; font-size: 12px; border-radius: 5px; }
                        QPushButton:hover { background-color: #A50000; }
                        QPushButton:pressed { background-color: #B80000; }
                    ]]
                },
                ui:Button{
                    ID = "ResetToDefaults",
                    Text = "Reset To Default Settings",
                    StyleSheet = [[
                        QPushButton { background-color: #8B0000; color: white; font-weight: bold; font-size: 12px; border-radius: 5px; }
                        QPushButton:hover { background-color: #A50000; }
                        QPushButton:pressed { background-color: #B80000; }
                    ]]
                },
            },
            ui:HGroup{
                ui:Button{
                    ID = "SaveSettings",
                    Text = "Save and Close"
                },
                ui:Button{
                    ID = "Cancel",
                    Text = "Cancel and Close"
                },
            },
            -- Add a separator before license & update management section
            ui:Label{Text = "──────────────────────────────", Alignment = {AlignHCenter = true}, StyleSheet = "color: #888; font-size: 12px;"},
            ui:Button{
                ID = "UpdateScript",
                Text = "Check for Updates",
                StyleSheet = [[
                    QPushButton { background-color: #2D8CFF; color: white; font-weight: bold; font-size: 12px; border-radius: 5px; }
                    QPushButton:hover { background-color: #4A9FFF; }
                    QPushButton:pressed { background-color: #1A7AEE; }
                ]]
            },
            ui:Button{
                ID = "DeactivateLicense", 
                Text = "Deactivate License",
                Visible = show_deactivate,
                StyleSheet = [[
                    QPushButton { 
                        background-color: #8B0000; 
                        color: white; 
                        font-weight: bold; 
                        font-size: 12px; 
                        border-radius: 5px;
                    }
                    QPushButton:hover { background-color: #A50000; }
                    QPushButton:pressed { background-color: #B80000; }
                ]],
            },
            ui:Label{Text = "──────────────────────────────", Alignment = {AlignHCenter = true}, StyleSheet = "color: #888; font-size: 12px;"},
        }
    })

    -- Store advanced window reference globally
    _G.advanced_win = advanced_win

    local items = advanced_win:GetItems()
    local beat_color_dropdown = items.BeatColorDropdown
    local tempo_color_dropdown = items.TempoColorDropdown
    beat_color_dropdown:Clear()
    tempo_color_dropdown:Clear()

    local beat_color_index = 0
    local tempo_color_index = 0
    for i, color in ipairs(marker_colors) do
        beat_color_dropdown:AddItem(color)
        tempo_color_dropdown:AddItem(color)
        if color == beat_color then
            beat_color_index = i - 1
        end
        if color == tempo_color then
            tempo_color_index = i - 1
        end
    end
    
    beat_color_dropdown.CurrentIndex = beat_color_index
    tempo_color_dropdown.CurrentIndex = tempo_color_index

    function advanced_win.On.SaveSettings.Clicked()
        filter_duplicates = items.UnifiedClipActions.Checked
        add_markers_to_duplicates = filter_duplicates
        save_analysis = items.SaveAnalysis.Checked
        enable_pattern = items.EnablePattern.Checked
        if enable_pattern then
            beats_per_bar = items.BeatsPerBar.Value
        end
        excluded_tracks = items.ExcludeTracks.Text
        beat_color = marker_colors[beat_color_dropdown.CurrentIndex + 1]
        tempo_color = marker_colors[tempo_color_dropdown.CurrentIndex + 1]

        -- Save settings
        save_user_settings()
        
        settings_changed = true
        items.SaveSettings.Text = "Settings Saved"
        
        -- Don't reload clips here - we'll do it after closing the window
        advanced_win:Hide()
        disp:ExitLoop()
    end

    function advanced_win.On.ResetToDefaults.Clicked()
        local success = restore_default_settings()
        
        -- Update UI to reflect the default settings
        items.UnifiedClipActions.Checked = filter_duplicates
        items.SaveAnalysis.Checked = save_analysis
        items.EnablePattern.Checked = enable_pattern
        items.BeatsPerBar.Value = beats_per_bar
        items.ExcludeTracks.Text = excluded_tracks
        
        -- Update dropdown selections for colors
        local beat_color_index = 0
        local tempo_color_index = 0
        for i, color in ipairs(marker_colors) do
            if color == beat_color then
                beat_color_index = i - 1
            end
            if color == tempo_color then
                tempo_color_index = i - 1
            end
        end
        beat_color_dropdown.CurrentIndex = beat_color_index
        tempo_color_dropdown.CurrentIndex = tempo_color_index
        
        -- Only print the message once, after the UI is updated
        print("[SureBeat] Settings reset to defaults")
    end

    function advanced_win.On.RemoveCache.Clicked()
        os.remove(temp_file_path)
        print("[SureBeat] Analysis cache file removed.")
    end

    function advanced_win.On.Cancel.Clicked()
        advanced_win:Hide()
        disp:ExitLoop()
    end

    -- Add handler for deactivate license button
    function advanced_win.On.DeactivateLicense.Clicked()
        if open_deactivation_dialog(disp, license_key) then
            -- If deactivation was successful, log and exit immediately
            advanced_win:Hide()
            
            if win then
                win:Hide()
            end
            
            -- Exit all UI loops
            disp:ExitLoop()
            
            -- Log termination
            print("[SureBeat] License deactivated. Terminating SureBeat...")
            
            -- Completely terminate the script
            os.exit(0)
        end
    end

    -- Add handler for the update button
    function advanced_win.On.UpdateScript.Clicked()
        advanced_win:Hide()
        open_update_window(disp, win, advanced_win)
        -- Don't show advanced_win again if update was successful
    end

    advanced_win.On[advanced_win.ID].Close = function(ev)
        advanced_win:Hide()
        disp:ExitLoop()
    end

    advanced_win:Show()
    disp:RunLoop()
    advanced_win:Hide()

    -- Show the main window again
    win:Show()

    return settings_changed
end

-- Add new function to handle the update window
function open_update_window(disp, main_win, advanced_win)
    local ui = fu.UIManager
    local update_win = disp:AddWindow({
        ID = "UpdateWindow",
        WindowTitle = "SureBeat Update Manager",
        Geometry = {150, 150, 400, 300},
        ui:VGroup{
            ID = "root",
            ui:Label{
                Text = "<b>SureBeat Update Manager</b>",
                Alignment = {AlignHCenter = true},
                StyleSheet = "font-size: 16px; color: white; padding-bottom: 10px;"
            },
            ui:Label{
                Text = "Select a version to install:",
                StyleSheet = "font-size: 12px; color: white;"
            },
            ui:ComboBox{
                ID = "VersionDropdown",
                StyleSheet = "font-size: 12px; color: black; background-color: #DEC091; border-radius: 5px; padding: 5px;",
            },
            ui:TextEdit{
                ID = "UpdateInfo",
                Text = "Fetching available versions...",
                ReadOnly = true,
                StyleSheet = "color: #333; font-size: 12px; background-color: #f8f9fa; padding: 10px; border-radius: 5px;",
            },
            ui:HGroup{
                ui:Button{
                    ID = "InstallVersion",
                    Text = "Install Selected Version",
                },
                ui:Button{
                    ID = "Cancel",
                    Text = "Cancel and Close",
                },
            },
            ui:Button{
                ID = "RestartSureBeat",
                Text = "Restart SureBeat",
                Visible = false,
                StyleSheet = [[
                    QPushButton { background-color: #2D8CFF; color: white; font-weight: bold; font-size: 12px; border-radius: 5px; }
                    QPushButton:hover { background-color: #4A9FFF; }
                    QPushButton:pressed { background-color: #1A7AEE; }
                ]]
            },
        },
    })
    
    local items = update_win:GetItems()
    local version_dropdown = items.VersionDropdown
    
    -- Fetch available versions from server
    function fetch_versions()
        -- Update the URL to specify SureBeat versions
        local url = update_server_url .. "/macos/versions"
        print("[SureBeat] Fetching available SureBeat versions from: " .. url)
        
        local command = string.format([[curl -s -X GET "%s" -H "x-api-key: %s"]], url, api_key)
        local handle = io.popen(command, "r")
        local result = handle:read("*a")
        handle:close()
        
        if result and result ~= "" then
            local versions_data = json.decode(result)
            if versions_data and versions_data.versions then
                -- Simple descending sort (newest first)
                table.sort(versions_data.versions, function(a, b) return a > b end)
                
                -- Populate the dropdown with sorted versions
                version_dropdown:Clear()
                for _, version in ipairs(versions_data.versions) do
                    version_dropdown:AddItem(version)
                end
                
                if #versions_data.versions > 0 then
                    items.UpdateInfo:SetText("Select a SureBeat version to install.\nCurrent version: " .. CURRENT_VERSION)
                    version_dropdown.CurrentIndex = 0
                else
                    items.UpdateInfo:SetText("No SureBeat versions available.")
                end
            else
                items.UpdateInfo:SetText("Failed to parse server response.")
            end
        else
            items.UpdateInfo:SetText("Unable to connect to update server.")
        end
    end
    
    -- Download and install the selected version
    function download_version(version)
        -- Update URL to specify SureBeat version
        local url = update_server_url .. "/macos/download/" .. version
        local download_path = script_path .. "SureBeat_main.luac"
        local backup_path = script_path .. "SureBeat_main.luac.bak"
        
        items.UpdateInfo:SetText("Downloading SureBeat version " .. version .. "...\nPlease wait.")
        
        -- Create backup of current file if it exists
        if io.open(download_path, "r") then
            os.rename(download_path, backup_path)
        end
        
        local command = string.format([[curl -s -X GET "%s" -H "x-api-key: %s" -o "%s"]], 
            url, api_key, download_path)
        
        local success = os.execute(command)
        
        if success then
            local file = io.open(download_path, "r")
            if file then
                file:close()
                items.UpdateInfo:SetText("Version " .. version .. " installed successfully.\n" .. 
                    "Please restart SureBeat for changes to take effect.")
                -- Store the installed version for later use when restarting
                update_win.installed_version = version
                -- Also store in a global variable as a backup
                INSTALLED_VERSION = version
                items.RestartSureBeat.Visible = true
            else
                -- If download failed, restore backup
                if io.open(backup_path, "r") then
                    os.rename(backup_path, download_path)
                end
                items.UpdateInfo:SetText("Failed to download version " .. version .. ".")
            end
        else
            -- If download failed, restore backup
            if io.open(backup_path, "r") then
                os.rename(backup_path, download_path)
            end
            items.UpdateInfo:SetText("Failed to download version " .. version .. ".")
        end
    end
    
    -- Set up event handlers
    function update_win.On.InstallVersion.Clicked()
        local selected_index = version_dropdown.CurrentIndex
        if selected_index >= 0 then
            local version = version_dropdown.CurrentText 
            if version and version ~= "" then
                download_version(version)
                -- Store the version in a more reliable way - as a global variable
                INSTALLED_VERSION = version
            end
        end
    end
    
    function update_win.On.Cancel.Clicked()
        update_win:Hide()
        disp:ExitLoop()
        
        -- Show the advanced settings window again if it exists
        if advanced_win then
            advanced_win:Show()
        end
    end
    
    function update_win.On.RestartSureBeat.Clicked()
        -- Close all windows and terminate
        print("[SureBeat] Closing all windows and launching new version...")
        
        -- Store version information for logging
        local previous_version = CURRENT_VERSION
        -- Use the global variable as a fallback
        local new_version = update_win.installed_version or INSTALLED_VERSION or "Unknown"
        
        -- Improved version transition message based on version comparison
        local function compare_versions(v1, v2)
            -- Extract numeric parts from version strings (e.g., "v3.0.0" -> 3,0,0)
            local function extract_version_numbers(v)
                local major, minor, patch = v:match("v(%d+)%.(%d+)%.(%d+)")
                if major and minor and patch then
                    return tonumber(major), tonumber(minor), tonumber(patch)
                end
                return 0, 0, 0 -- Default if pattern doesn't match
            end
            
            local v1_major, v1_minor, v1_patch = extract_version_numbers(v1)
            local v2_major, v2_minor, v2_patch = extract_version_numbers(v2)
            
            if v1_major > v2_major then
                return 1
            elseif v1_major < v2_major then
                return -1
            elseif v1_minor > v2_minor then
                return 1
            elseif v1_minor < v2_minor then
                return -1
            elseif v1_patch > v2_patch then
                return 1
            elseif v1_patch < v2_patch then
                return -1
            else
                return 0
            end
        end
        
        local version_comparison = compare_versions(new_version, previous_version)
        local transition_message
        
        if version_comparison > 0 then
            transition_message = "Upgrading from version " .. previous_version .. " to version " .. new_version
        elseif version_comparison < 0 then
            transition_message = "Downgrading from version " .. previous_version .. " to version " .. new_version
        else
            transition_message = "Reinstalling version " .. new_version
        end
        
        -- Log the appropriate message
        print("[SureBeat] " .. transition_message)
        
        -- Hide all windows first
        update_win:Hide()
        
        if advanced_win then
            advanced_win:Hide()
        end
        
        if main_win then
            main_win:Hide()
        end
        
        -- Exit all UI loops
        disp:ExitLoop()
        
        -- Use loadfile approach to launch the new SureBeat_main.luac
        -- Path to SureBeat_main.luac
        local compiledScriptPath = script_path .. "SureBeat_main.luac"
        print("[SureBeat] Loading new version from: " .. compiledScriptPath)
        
        -- Attempt to load and execute the compiled file
        local mainFunc, loadError = loadfile(compiledScriptPath)
        
        -- Check if the file loaded successfully
        if mainFunc then
            print("[SureBeat] New version loaded successfully. Launching...")
            mainFunc()  -- Execute the compiled script
        else
            print("[SureBeat] Error loading new version: " .. (loadError or "Unknown error"))
        end
        
        -- Force immediate termination of this script if we somehow get here
        os.exit(0)
    end
    
    update_win.On[update_win.ID].Close = function(ev)
        update_win:Hide()
        disp:ExitLoop()
        
        -- Also show the advanced settings window when closing via the X button
        if advanced_win then
            advanced_win:Show()
        end
    end
    
    -- Fetch versions when the window opens
    fetch_versions()
    
    update_win:Show()
    disp:RunLoop()
    update_win:Hide()
end

-- 5. Main Plugin Logic & UI
local beat = {}
local tempo = {}
local analyzed_clips = {}
local filtered_clips = {}

function get_audio_clips_from_timeline(quiet)
    if not quiet then
        print("[SureBeat] Retrieving audio clips from timeline...")
    end
    
    local resolve = Resolve()
    local projectManager = resolve:GetProjectManager()
    local project = projectManager:GetCurrentProject()
    local timeline = project:GetCurrentTimeline()

    local audio_clips = {}
    local excluded_tracks_set = {}
    for track in excluded_tracks:gmatch("%d+") do
        excluded_tracks_set[tonumber(track)] = true
    end

    if timeline then
        local track_count = timeline:GetTrackCount("audio")
        for track = 1, track_count do
            if not excluded_tracks_set[track] then
                local clips = timeline:GetItemsInTrack("audio", track)
                for clip_index, clip in ipairs(clips) do
                    local clip_name = clip:GetName()
                    local media_pool_item = clip:GetMediaPoolItem()
                    if media_pool_item then
                        local clip_path = media_pool_item:GetClipProperty("File Path")
                        if clip_path and clip_name then
                            local dropdown_name
                            if filter_duplicates then
                                dropdown_name = clip_name
                            else
                                dropdown_name = string.format("Track %d, Clip %d: %s", track, clip_index, clip_name)
                            end
                            table.insert(audio_clips, {name = dropdown_name, path = clip_path, track = track, clip_index = clip_index})
                            -- Only print if not in quiet mode
                            if not quiet then
                                print("[SureBeat] Added to dropdown -", dropdown_name)
                            end
                        end
                    end
                end
            end
        end
    else
        if not quiet then
            print("[SureBeat] No active timeline found.")
        end
    end
    
    if not quiet then
        print("[SureBeat] Total audio clips found:", #audio_clips)
    end
    return audio_clips
end

function filter_duplicate_clips(audio_clips)
    local unique_clips = {}
    local seen_paths = {}

    for _, clip in ipairs(audio_clips) do
        if not seen_paths[clip.path] then
            table.insert(unique_clips, {name = clip.name, path = clip.path})
            seen_paths[clip.path] = true
        end
    end

    return unique_clips
end

function detect_beat_and_tempo(audio_path)
    print("[SureBeat] Starting beat and tempo detection with single-file SureBeat binary.")

    local command = string.format('"%s" "%s"', surebeat_binary, audio_path)
    print("[SureBeat] Running command:", command)

    local handle = io.popen(command, "r")
    if not handle then
        print("[SureBeat] ERROR: Could not execute SureBeat. Check if the file exists and is executable.")
        print("[SureBeat] HINT: You may need to set file permissions: chmod +x \".../SureBeat\"")
        return {}, {}
    end

    local output = handle:read("*a")
    local success, _, exit_code = handle:close()

    if not success then
        print("[SureBeat] ERROR: The SureBeat binary did not run successfully (exit code: " .. tostring(exit_code) .. ").")
        print("[SureBeat] Possible reasons:")
        print("  - The SureBeat file is not executable or missing (check chmod +x).")
        return {}, {}
    end

    print("[SureBeat] SureBeat output:\n" .. output)

    beat, tempo = {}, {}

    for line in output:gmatch("[^\r\n]+") do
        if line:find("BEAT:") then
            local time = tonumber(line:match("BEAT:%s*([%d%.]+)"))
            if time then table.insert(beat, time) end
        elseif line:find("TEMPO:") then
            local time = tonumber(line:match("TEMPO:%s*([%d%.]+)"))
            if time then table.insert(tempo, time) end
        end
    end

    print("[SureBeat] Detection completed. Beats:", #beat, "Tempos:", #tempo)
    return beat, tempo
end

function add_markers(win, track_number, clip_index, add_beat, add_tempo, beat_color, tempo_color)
    local resolve = Resolve()
    local projectManager = resolve:GetProjectManager()
    local project = projectManager:GetCurrentProject()
    local timeline = project:GetCurrentTimeline()
    if not timeline then
        print("[SureBeat] No active timeline found.")
        return false
    end

    local frame_rate = tonumber(timeline:GetSetting("timelineFrameRate"))
    local clips = timeline:GetItemsInTrack("audio", track_number)
    if not clips then
        print("[SureBeat] No clips found in the specified track.")
        return false
    end

    local target_clip = clips[clip_index]
    if not target_clip then
        print("[SureBeat] Failed to create markers. Could not find the specified audio clip on the timeline.")
        win:GetItems().InfoDisplay:SetText("Failed to create markers. Could not find the specified audio clip on the timeline.")
        return false
    end

    local clip_start_frame = math.floor(target_clip:GetStart() * frame_rate)
    local clip_end_frame = math.floor(target_clip:GetEnd() * frame_rate)

    local function add_markers_to_clip(target_clip)
        if add_beat and #beat > 0 then
            print("[SureBeat] Adding beat markers to timeline...")
            for i, beat_time in ipairs(beat) do
                local frame = math.floor(beat_time * frame_rate)
                if (clip_start_frame + frame) <= clip_end_frame then
                    local colorToUse = beat_color
                    if enable_pattern then
                        if (i % beats_per_bar) ~= 1 then
                            colorToUse = "Cream"
                        end
                    end
                    print(string.format("Adding %s beat marker at frame %d (%.3f seconds)", colorToUse, frame, beat_time))
                    target_clip:AddMarker(frame, colorToUse, "Beat", "Beat Marker", 1)
                end
            end
        else
            print("[SureBeat] No beats to add as markers.")
        end

        if add_tempo and #tempo > 0 then
            print("[SureBeat] Adding tempo markers to timeline...")
            for i, tempo_time in ipairs(tempo) do
                local frame = math.floor(tempo_time * frame_rate)
                if (clip_start_frame + frame) <= clip_end_frame then
                    local colorToUse = tempo_color
                    if enable_pattern then
                        if (i % beats_per_bar) ~= 1 then
                            colorToUse = "Cream" -- or any color from marker_colors
                        end
                    end
                    print(string.format("Adding %s tempo marker at frame %d (%.3f seconds)", colorToUse, frame, tempo_time))
                    target_clip:AddMarker(frame, colorToUse, "Tempo", "Tempo Marker", 1)
                end
            end
        else
            print("[SureBeat] No tempos to add as markers.")
        end
    end

    if add_markers_to_duplicates then
        for _, clip in ipairs(clips) do
            if clip:GetMediaPoolItem():GetClipProperty("File Path") == target_clip:GetMediaPoolItem():GetClipProperty("File Path") then
                add_markers_to_clip(clip)
            end
        end
    else
        add_markers_to_clip(target_clip)
    end

    print("[SureBeat] Marker addition completed successfully.")
    return true
end

function add_markers_by_name(win, clip_name, add_beat, add_tempo, beat_color, tempo_color)
    local resolve = Resolve()
    local projectManager = resolve:GetProjectManager()
    local project = projectManager:GetCurrentProject()
    local timeline = project:GetCurrentTimeline()
    if not timeline then
        print("[SureBeat] No active timeline found.")
        return false
    end

    local frame_rate = tonumber(timeline:GetSetting("timelineFrameRate"))
    local track_count = timeline:GetTrackCount("audio")

    local function add_markers_to_clip(target_clip)
        local clip_start_frame = math.floor(target_clip:GetStart() * frame_rate)
        local clip_end_frame = math.floor(target_clip:GetEnd() * frame_rate)

        if add_beat and #beat > 0 then
            print("[SureBeat] Adding beat markers to timeline...")
            for i, beat_time in ipairs(beat) do
                local frame = math.floor(beat_time * frame_rate)
                if (clip_start_frame + frame) <= clip_end_frame then
                    local colorToUse = beat_color
                    if enable_pattern then
                        if (i % beats_per_bar) ~= 1 then
                            colorToUse = "Cream"
                        end
                    end
                    print(string.format("Adding %s beat marker at frame %d (%.3f seconds)", colorToUse, frame, beat_time))
                    target_clip:AddMarker(frame, colorToUse, "Beat", "Beat Marker", 1)
                end
            end
        else
            print("[SureBeat] No beats to add as markers.")
        end

        if add_tempo and #tempo > 0 then
            print("[SureBeat] Adding tempo markers to timeline...")
            for i, tempo_time in ipairs(tempo) do
                local frame = math.floor(tempo_time * frame_rate)
                if (clip_start_frame + frame) <= clip_end_frame then
                    local colorToUse = tempo_color
                    if enable_pattern then
                        if (i % beats_per_bar) ~= 1 then
                            colorToUse = "Cream" -- or any color from marker_colors
                        end
                    end
                    print(string.format("Adding %s tempo marker at frame %d (%.3f seconds)", colorToUse, frame, tempo_time))
                    target_clip:AddMarker(frame, colorToUse, "Tempo", "Tempo Marker", 1)
                end
            end
        else
            print("[SureBeat] No tempos to add as markers.")
        end
    end

    for track = 1, track_count do
        local clips = timeline:GetItemsInTrack("audio", track)
        if clips then
            for _, clip in ipairs(clips) do
                if clip:GetName() == clip_name then
                    add_markers_to_clip(clip)
                end
            end
        end
    end

    print("[SureBeat] Marker addition completed successfully.")
    return true
end

function delete_markers_from_clip(track_number, clip_index)
    local resolve = Resolve()
    local projectManager = resolve:GetProjectManager()
    local project = projectManager:GetCurrentProject()
    local timeline = project:GetCurrentTimeline()
    if not timeline then
        print("[SureBeat] No active timeline found.")
        return
    end

    local clips = timeline:GetItemsInTrack("audio", track_number)
    if clips then
        local target_clip = clips[clip_index]
        if target_clip then
            if add_markers_to_duplicates then
                for _, clip in ipairs(clips) do
                    if clip:GetMediaPoolItem():GetClipProperty("File Path") == target_clip:GetMediaPoolItem():GetClipProperty("File Path") then
                        if clip:DeleteMarkersByColor("All") then
                            print("[SureBeat] Deleted all markers from clip:", clip:GetName())
                        else
                            print("[SureBeat] Failed to delete markers from clip:", clip:GetName())
                        end
                    end
                end
            else
                if target_clip:DeleteMarkersByColor("All") then
                    print("[SureBeat] Deleted all markers from selected clip:", target_clip:GetName())
                else
                    print("[SureBeat] Failed to delete markers from clip:", target_clip:GetName())
                end
            end
        else
            print("[SureBeat] No valid audio clip selected.")
        end
    else
        print("[SureBeat] No clips found in the specified track.")
    end
end

function delete_markers_from_clip_by_name(clip_name)
    local resolve = Resolve()
    local projectManager = resolve:GetProjectManager()
    local project = projectManager:GetCurrentProject()
    local timeline = project:GetCurrentTimeline()
    if not timeline then
        print("[SureBeat] No active timeline found.")
        return
    end

    local track_count = timeline:GetTrackCount("audio")
    for track = 1, track_count do
        local clips = timeline:GetItemsInTrack("audio", track)
        for _, clip in ipairs(clips) do
            if clip:GetName() == clip_name then
                if clip:DeleteMarkersByColor("All") then
                    print("[SureBeat] Deleted all markers from clip:", clip:GetName())
                else
                    print("[SureBeat] Failed to delete markers from clip:", clip:GetName())
                end
            end
        end
    end
end

function delete_all_markers()
    local resolve = Resolve()
    local projectManager = resolve:GetProjectManager()
    local project = projectManager:GetCurrentProject()
    local timeline = project:GetCurrentTimeline()
    if not timeline then
        print("[SureBeat] No active timeline found.")
        return
    end

    local track_count = timeline:GetTrackCount("audio")
    for track = 1, track_count do
        local clips = timeline:GetItemsInTrack("audio", track)
        for clip_index, clip in ipairs(clips) do
            if clip then
                if clip:DeleteMarkersByColor("All") then
                    print(string.format("Deleted markers from Track %d, Clip %d: %s", track, clip_index, clip:GetName()))
                else
                    print(string.format("Failed to delete markers from Track %d, Clip %d: %s", track, clip_index, clip:GetName()))
                end
            end
        end
    end
    print("[SureBeat] Deleted all markers from all audio clips on the timeline.")
end

function load_analysis_cache()
    local file = io.open(temp_file_path, "r")
    if file then
        local content = file:read("*a")
        file:close()
        analyzed_clips = json.decode(content) or {}
    else
        analyzed_clips = {}
    end
end

-- Function to save the analysis cache to a file
function save_analysis_cache()
    if save_analysis then
        -- Removed redundant folder creation
        local file = io.open(temp_file_path, "w")
        if file then
            file:write(json.encode(analyzed_clips))
            file:close()
        end
    end
end

function save_user_settings()
    -- Removed redundant folder creation
    local settings = {
        filter_duplicates = filter_duplicates,
        save_analysis = save_analysis,
        enable_pattern = enable_pattern,
        beats_per_bar = beats_per_bar,
        excluded_tracks = excluded_tracks,
        beat_color = beat_color,
        tempo_color = tempo_color,
        add_markers_to_duplicates = filter_duplicates
    }
    
    local file = io.open(settings_file_path, "w")
    if file then
        file:write(json.encode(settings))
        file:close()
        print("[SureBeat] User settings saved")
        return true
    else
        print("[SureBeat] Failed to save user settings")
        return false
    end
end

function load_user_settings()
    local file = io.open(settings_file_path, "r")
    if file then
        local content = file:read("*a")
        file:close()
        
        local settings = json.decode(content)
        if settings then
            -- Check if each setting exists rather than using 'or'
            if settings.filter_duplicates ~= nil then 
                filter_duplicates = settings.filter_duplicates 
            end
            if settings.save_analysis ~= nil then 
                save_analysis = settings.save_analysis 
            end
            if settings.enable_pattern ~= nil then 
                enable_pattern = settings.enable_pattern 
            end
            if settings.beats_per_bar ~= nil then 
                beats_per_bar = settings.beats_per_bar 
            end
            if settings.excluded_tracks ~= nil then 
                excluded_tracks = settings.excluded_tracks 
            end
            if settings.beat_color ~= nil then 
                beat_color = settings.beat_color 
            end
            if settings.tempo_color ~= nil then 
                tempo_color = settings.tempo_color 
            end
            if settings.add_markers_to_duplicates ~= nil then 
                add_markers_to_duplicates = settings.add_markers_to_duplicates 
            end
            
            print("[SureBeat] User settings loaded successfully")
            return true
        end
    end
    
    print("[SureBeat] No saved user settings found, using defaults")
    return false
end

function main()
    -- Move all local variable declarations to the top of the function
    local ui = fu.UIManager
    local disp = bmd.UIDispatcher(ui)
    local last_logged_path = nil
    local audio_clips
    local items
    local dropdown
    local settings_updated = false
    
    -- Function declarations at the top
    local function updateSmartButtonState(selected_index, quiet)
        -- This function updates the button text and state based on context
        if not selected_index or selected_index < 1 or #filtered_clips < selected_index then
            -- No valid clip selected
            items.SmartButton.Text = "Select Audio Clip"
            items.SmartButton.Enabled = false
            return
        end
        
        local selected_clip_path = filtered_clips[selected_index].path
        
        if analyzed_clips[selected_clip_path] then
            -- Add more detailed check for analysis data
            local has_beats = analyzed_clips[selected_clip_path].beat and 
                              #analyzed_clips[selected_clip_path].beat > 0
            local has_tempos = analyzed_clips[selected_clip_path].tempo and 
                               #analyzed_clips[selected_clip_path].tempo > 0
            
            if has_beats or has_tempos then
                -- Analysis data exists for this clip - don't print debug message
                items.SmartButton.Text = "Create Markers"
                items.SmartButton.Enabled = true
            else
                -- Cache exists but no usable data - don't print debug message
                items.SmartButton.Text = "Analyze Audio"
                items.SmartButton.Enabled = true
            end
        else
            -- No analysis data - need to analyze first - don't print debug message
            items.SmartButton.Text = "Analyze Audio"
            items.SmartButton.Enabled = true
        end
    end
    
    local function dropdown_selection(quiet)
        local selected_index = dropdown.CurrentIndex + 1
        if filtered_clips[selected_index] then
            local selected_clip_path = filtered_clips[selected_index].path
            
            -- Update the InfoDisplay
            if items.InfoDisplay.Text ~= "Selected file: " .. filtered_clips[selected_index].name then
                -- Only log if quiet is false and this is a new path
                if not quiet and last_logged_path ~= selected_clip_path then
                    print("[SureBeat] Selected audio track file path:", selected_clip_path)
                    last_logged_path = selected_clip_path
                end
                items.InfoDisplay.Text = "Selected file: " .. filtered_clips[selected_index].name
            end
            
            if analyzed_clips[selected_clip_path] then
                beat, tempo = analyzed_clips[selected_clip_path].beat, analyzed_clips[selected_clip_path].tempo
                
                -- Check if the cache actually has useful data
                if (beat and #beat > 0) or (tempo and #tempo > 0) then
                    items.InfoDisplay.Text = "Cache found. Click 'Create Markers' to add markers."
                else
                    items.InfoDisplay.Text = "Cache exists but no beats/tempo found. Click 'Analyze Audio' to start."
                end
            else
                beat, tempo = {}, {}
                items.InfoDisplay.Text = "No cache found. Click 'Analyze Audio' to start."
            end
            
            -- Update smart button state - call after setting beat and tempo
            -- Pass the quiet parameter to prevent debug messages
            updateSmartButtonState(selected_index, quiet)
        else
            if not quiet then
                print("[SureBeat] No valid audio clip selected.")
            end
            updateSmartButtonState(nil, quiet) -- No valid selection, pass quiet parameter
        end
    end

    local function filter_audio_clips(search_query)
        dropdown:Clear()
        filtered_clips = {}
        local found_clips = false
        for _, clip in ipairs(audio_clips) do
            if clip.name:lower():find(search_query:lower()) then
                dropdown:AddItem(clip.name)
                table.insert(filtered_clips, clip)
                found_clips = true
            end
        end
    
        if not found_clips then
            items.InfoDisplay:SetText("No audio clips found matching your search.")
        else
            items.InfoDisplay:SetText("Search results updated.")
        end

        dropdown.CurrentIndex = 0
        dropdown_selection(true)
    end

    local function reset_search(items_ref, dropdown_ref, audio_clips_ref, quiet)
        items_ref.SearchBox.Text = ""
        dropdown_ref:Clear()
        filtered_clips = audio_clips_ref
        for _, clip in ipairs(audio_clips_ref) do
            dropdown_ref:AddItem(clip.name)
        end
        
        if not quiet then
            items_ref.InfoDisplay:SetText("Search reset. All audio clips are displayed.")
        end
        
        dropdown_ref.CurrentIndex = 0
        dropdown_selection(quiet) -- This ensures we pass the quiet parameter through
    end

    local function SmartButtonClicked()
        local selected_index = dropdown.CurrentIndex + 1
        if not filtered_clips[selected_index] then
            items.InfoDisplay:SetText("Please select an audio clip first.")
            return
        end
        
        local selected_clip_path = filtered_clips[selected_index].path
        
        if analyzed_clips[selected_clip_path] and 
           ((#analyzed_clips[selected_clip_path].beat > 0) or (#analyzed_clips[selected_clip_path].tempo > 0)) then
            -- We have analysis data, so create markers
            local add_beat = items.AddBeat.Checked
            local add_tempo = items.AddTempo.Checked
            
            if not add_beat and not add_tempo then
                items.InfoDisplay:SetText("Please select at least one marker type.")
                return
            end
            
            items.InfoDisplay:SetText("Creating markers... Please wait.")
            
            if filter_duplicates then
                local clip_name = filtered_clips[selected_index].name
                if add_markers_by_name(win, clip_name, add_beat, add_tempo, beat_color, tempo_color) then
                    items.InfoDisplay:SetText("Markers created successfully.")
                else
                    items.InfoDisplay:SetText("Failed to create markers.")
                end
            else
                local track_number = filtered_clips[selected_index].track
                local clip_index = filtered_clips[selected_index].clip_index

                if add_markers(win, track_number, clip_index, add_beat, add_tempo, beat_color, tempo_color) then
                    items.InfoDisplay:SetText("Markers created successfully.")
                else
                    items.InfoDisplay:SetText("Failed to create markers.")
                end
            end
        else
            -- No analysis data exists, so analyze the audio
            items.InfoDisplay:SetText("Analyzing audio... Please wait.")
            beat, tempo = detect_beat_and_tempo(selected_clip_path)
            analyzed_clips[selected_clip_path] = {beat = beat, tempo = tempo}
            save_analysis_cache()
            
            if #beat > 0 or #tempo > 0 then
                items.InfoDisplay:SetText("Analysis complete. Ready to create markers.")
                items.SmartButton.Text = "Create Markers"  -- Explicitly update button text
                -- updateSmartButtonState(selected_index) -- This was commented out, we need to explicitly set the text
            else
                items.InfoDisplay:SetText("Analysis failed or returned no data.")
            end
        end
    end

    -- Load settings first
    load_user_settings()
    load_analysis_cache()
    
    -- Create UI
    local win = disp:AddWindow({
        ID = "AudioSelector",
        WindowTitle = "SureBeat by Mansi Visuals",
        Geometry = {100, 100, 450, 400},
        ui:VGroup{
            ID = "root",
            ui:Label{Text = "<b>SureBeat " .. CURRENT_VERSION .. "</b>", Alignment = {AlignHCenter = true}, StyleSheet = "font-size: 16px; color: white; padding-bottom: 12px;"},
            ui:Label{Text = "Select an audio clip:", Alignment = {AlignLeft = true}, StyleSheet = "font-size: 12px; color: white;"},
            ui:ComboBox{ID = "Dropdown", StyleSheet = "font-size: 12px; color: black; background-color: #DEC091; border-radius: 5px; padding: 5px;"},
            ui:LineEdit{
                ID = "SearchBox",
                PlaceholderText = "Search for audio clips. .e.g. name of audio file or track 1 clip 1",
                MinimumSize = {250, 20},
                StyleSheet = "color: black; background-color: #DEC091;"},
            ui:HGroup{
                ui:CheckBox{ID = "AddTempo", Text = "Add Tempo Markers", Checked = true, StyleSheet = "color: white; font-size: 12px;"},
                ui:CheckBox{ID = "AddBeat", Text = "Add Beat Markers", Checked = false, StyleSheet = "color: white; font-size: 12px;"},
            },
            -- Replace the two buttons with a single smart button
            ui:Button{
                ID = "SmartButton",
                Text = "Select Audio Clip", -- Will update dynamically
                MinimumSize = {200, 30}, 
                StyleSheet = [[
                    QPushButton { background-color: #DEC091; color: black; font-weight: bold; font-size: 12px; border-radius: 5px; }
                    QPushButton:hover { background-color: #E5B88E; }
                    QPushButton:pressed { background-color: #CBA672; }
                    QPushButton:disabled { background-color: #888888; color: #CCCCCC; }
                ]],
                Enabled = false,
            },

            ui:TextEdit{
                ID = "InfoDisplay",
                Text = "Status: Select an audio clip.",
                ReadOnly = true,
                MinimumSize = {60, 50},
                StyleSheet = "color: #333; font-size: 12px; background-color: #f8f9fa; padding: 10px; border-radius: 5px;",
            },
            ui:HGroup{
                ui:Button{
                    ID = "DeleteMarkers",
                    Text = "Delete Markers From Selected Clip",
                    MinimumSize = {30, 20},
                    StyleSheet = [[
                        QPushButton { background-color: #8B0000; color: white; font-weight: bold; font-size: 12px; border-radius: 5px; }
                        QPushButton:hover { background-color: #A50000; }
                        QPushButton:pressed { background-color: #B80000; }
                    ]],
                },
                ui:Button{
                    ID = "DeleteAllMarkers",
                    Text = "Delete All Markers From Timeline",
                    MinimumSize = {30, 20},
                    StyleSheet = [[
                        QPushButton { background-color: #8B0000; color: white; font-weight: bold; font-size: 12px; border-radius: 5px; }
                        QPushButton:hover { background-color: #A50000; }
                        QPushButton:pressed { background-color: #B80000; }
                    ]],
                },
            },
            ui:HGroup{
                ui:Button{
                    ID = "AdvancedSettings",
                    Text = "Advanced Settings",
                    MinimumSize = {30, 20},
                },
            },
            ui:Label{
                Text = "Crafted for DaVinci Resolve by Mansi Visuals",
                Alignment = {AlignHCenter = true},
                StyleSheet = "font-size: 14px; color: white; padding-top: 12px;",
            },
        },
    })

    -- Initialize lists after UI creation
    audio_clips = get_audio_clips_from_timeline()
    if filter_duplicates then
        audio_clips = filter_duplicate_clips(audio_clips)
    end
    
    -- Get UI items after window creation
    items = win:GetItems()
    dropdown = items.Dropdown
    
    -- Initialize dropdown
    dropdown:Clear()
    for _, clip in ipairs(audio_clips) do
        dropdown:AddItem(clip.name)
    end

    filtered_clips = audio_clips
    
    -- Set initial dropdown state
    dropdown.CurrentIndex = 0
    dropdown_selection(false)

    -- Connect UI event handlers
    win.On.Dropdown.CurrentIndexChanged = function() dropdown_selection(false) end
    win.On.SmartButton.Clicked = SmartButtonClicked
    win.On.SearchBox.TextChanged = function() filter_audio_clips(items.SearchBox.Text) end
    
    -- Add the missing event handlers for delete buttons
    win.On.DeleteMarkers.Clicked = function()
        local selected_index = dropdown.CurrentIndex + 1
        if not filtered_clips[selected_index] then
            items.InfoDisplay:SetText("Please select an audio clip first.")
            return
        end
        
        if filter_duplicates then
            local clip_name = filtered_clips[selected_index].name
            delete_markers_from_clip_by_name(clip_name)
            items.InfoDisplay:SetText("Markers deleted from selected clip(s).")
        else
            local track_number = filtered_clips[selected_index].track
            local clip_index = filtered_clips[selected_index].clip_index
            delete_markers_from_clip(track_number, clip_index)
            items.InfoDisplay:SetText("Markers deleted from selected clip.")
        end
    end
    
    win.On.DeleteAllMarkers.Clicked = function()
        delete_all_markers()
        items.InfoDisplay:SetText("All markers deleted from timeline.")
    end

    win.On.AdvancedSettings.Clicked = function() 
        local settings_changed = open_advanced_settings(win, dropdown)
        if settings_changed then
            audio_clips = get_audio_clips_from_timeline(true)  -- true = quiet mode
            if filter_duplicates then
                audio_clips = filter_duplicate_clips(audio_clips)
            end
            reset_search(items, dropdown, audio_clips, true)  -- true = quiet mode
        end
    end

    win.On[win.ID].Close = function(ev)
        print("[SureBeat] Closing SureBeat plugin UI and clearing cached data...")
        analyzed_clips = {}
        disp:ExitLoop()
    end

    -- Show window and run event loop
    win:Show()
    disp:RunLoop()
    win:Hide()
    print("[SureBeat] SureBeat plugin terminated.")
end

main()
    
else
    print("[SureBeat] SureBeat will not run without a valid trial or license.")
end 