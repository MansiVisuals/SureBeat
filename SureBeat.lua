-- SureBeat by MansiVisuals
-- Copyright (C) 2024 Mansi Visuals
-- This file is part of SureBeat-Madmom and is licensed under the AGPL-3.0.
-- See the LICENSE file in the project root or visit <https://www.gnu.org/licenses/agpl-3.0.html> for details.

-- Paths for Python and the Python script
local python_path = "/usr/bin/python3"  -- Update if your path differs (run command 'which python3' in terminal)
local beat_detection_script = "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Utility/SureBeat/beat_detection.py"

-- Temporary variables for audio processing
local beat = {}
local tempo = {}

-- Function to detect beat and tempo using Madmom through Python
function detect_beat_and_tempo(audio_path)
    print("Starting beat and tempo detection with Madmom.")
    
-- Construct the command using default python3 in the system PATH
    local command = string.format('PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin" python3 "%s" "%s"', beat_detection_script, audio_path)
    print("Running command:", command)

    local handle = io.popen(command)
    local output = handle:read("*a")
    handle:close()
    print("Madmom output:\n" .. output)

    beat = {}
    tempo = {}

    -- Parse output for beats and tempos
    for line in output:gmatch("[^\r\n]+") do
        if line:find("BEAT:") then
            local time = tonumber(line:match("BEAT:%s*([%d%.]+)"))
            if time then table.insert(beat, time) end
        elseif line:find("TEMPO:") then
            local time = tonumber(line:match("TEMPO:%s*([%d%.]+)"))
            if time then table.insert(tempo, time) end
        end
    end

    print("Detection completed. Beats:", #beat, "Tempos:", #tempo)
end

-- Function to add markers based on detected beats and/or tempo
function add_markers(win, audio_file_name, add_beat, add_tempo)
    local resolve = Resolve()
    local projectManager = resolve:GetProjectManager()
    local project = projectManager:GetCurrentProject()
    local timeline = project:GetCurrentTimeline()
    if not timeline then
        print("No active timeline found.")
        return false
    end

    local frame_rate = tonumber(timeline:GetSetting("timelineFrameRate"))
    local track_count = timeline:GetTrackCount("audio")
    local target_clip, clip_start_frame, clip_end_frame = nil, 0, 0

    -- Locate the audio clip on the timeline
    for track = 1, track_count do
        for _, clip in ipairs(timeline:GetItemsInTrack("audio", track)) do
            if clip:GetName():find(audio_file_name, 1, true) then
                target_clip = clip
                clip_start_frame = math.floor(clip:GetStart() * frame_rate)
                clip_end_frame = math.floor(clip:GetEnd() * frame_rate)
                break
            end
        end
        if target_clip then break end
    end

    if not target_clip then
        print("Failed to create markers. Could not find matching audio clip on the timeline.")
        win:GetItems().InfoDisplay:SetText("Failed to create markers. Could not find matching audio clip on the timeline.")
        return false
    end

    -- Adding beat markers
    if add_beat and #beat > 0 then
        print("Adding beat markers to timeline...")
        for _, beat_time in ipairs(beat) do
            local frame = math.floor(beat_time * frame_rate)
            if (clip_start_frame + frame) <= clip_end_frame then
                print(string.format("Adding red beat marker at frame %d (%.3f seconds)", frame, beat_time))
                target_clip:AddMarker(frame, "Red", "Beat", "Beat Marker", 1)
            end
        end
    else
        print("No beats to add as markers.")
    end

    -- Adding tempo markers
    if add_tempo and #tempo > 0 then
        print("Adding tempo markers to timeline...")
        for _, tempo_time in ipairs(tempo) do
            local frame = math.floor(tempo_time * frame_rate)
            if (clip_start_frame + frame) <= clip_end_frame then
                print(string.format("Adding blue tempo marker at frame %d (%.3f seconds)", frame, tempo_time))
                target_clip:AddMarker(frame, "Blue", "Tempo", "Tempo Marker", 1)
            end
        end
    else
        print("No tempos to add as markers.")
    end

    print("Marker addition completed successfully.")
    return true
end

-- Main function with UI for detecting beat and creating markers
function main()
    local ui = fu.UIManager
    local disp = bmd.UIDispatcher(ui)

    local win = disp:AddWindow({
        ID = "AudioSelector",
        WindowTitle = "SureBeat by Mansi Visuals",
        Geometry = {100, 100, 500, 400},
        ui:VGroup{
            ID = "root",
            ui:Label{Text = "<b>SureBeat v1.0.1</b>", Alignment = {AlignHCenter = true}, StyleSheet = "font-size: 14px; color: white; padding-bottom: 12px;"},
            ui:Label{Text = "SureBeat helps you edit to the beat of your audio!", Alignment = {AlignHCenter = true }, StyleSheet = "font-size: 12px; color: white;"},
            ui:HGroup{
                ui:Label{Text = "Audio File:", MinimumSize = {40, 15}, Alignment = {AlignRight = true}, StyleSheet = "font-size: 12px; color: white;"},
                ui:LineEdit{ID = "FilePath", Text = "No file selected", ReadOnly = true, MinimumSize = {75, 15}, StyleSheet = "font-size: 12px; color: #555; background-color: #f8f9fa; padding: 10px; border-radius: 5px;"},
                ui:Button{ID = "Browse", Text = "Browse", MinimumSize = {30, 12.5}, StyleSheet = "background-color: #DEC091; color: black; font-weight: bold; font-size: 12px; border-radius: 5px;"},
            },
            ui:HGroup{
                ui:CheckBox{ID = "AddBeat", Text = "Add Beat Markers (Red)", Checked = true, StyleSheet = "color: white; font-size: 12px;"},
                ui:CheckBox{ID = "AddTempo", Text = "Add Tempo Markers (Blue)", Checked = false, StyleSheet = "color: white; font-size: 12px;"},
            },
            ui:HGroup{
                ui:Button{ID = "Analyze", Text = "Analyze", MinimumSize = {30, 20}, StyleSheet = "background-color: #DEC091; color: black; font-weight: bold; font-size: 12px; border-radius: 5px;"},
                ui:Button{ID = "CreateMarkers", Text = "Create Markers", MinimumSize = {30, 20}, StyleSheet = "background-color: #DEC091; color: black; font-weight: bold; font-size: 12px; border-radius: 5px;"},
            },
            ui:TextEdit{
                ID = "InfoDisplay",
                Text = "Status: Awaiting analysis.",
                ReadOnly = true,
                MinimumSize = {60, 50},
                StyleSheet = "color: #333; font-size: 12px; background-color: #f8f9fa; padding: 10px; border-radius: 5px;",
            },
            ui:Label{
                Text = "Crafted for DaVinci Resolve by Mansi Visuals",
                Alignment = {AlignHCenter = true},
                StyleSheet = "font-size: 14px; color: white; padding-top: 12px;",
            },
            ui:HGroup{
                ui:Button{
                    ID = "BuyCoffee", 
                    Text = "Buy Me A Coffee", 
                    MinimumSize = {60, 25}, 
                    StyleSheet = "background-color: #DEC091; color: black; font-weight: bold; font-size: 12px; border-radius: 5px;",
                }
            },
            ui:Label{
                Text = "SureBeat is a passion project and maintained in my free time, so please consider donating if you like it.",
                Alignment = {AlignHCenter = true},
                StyleSheet = "font-size: 10px; color: gray; padding-top: 5px;"
            },
        },
    })

    local audio_path = ""
    local audio_file_name = ""

    function BrowseButtonClicked()
        local file_path = fusion:RequestFile("Select Audio File", "~/Downloads", "*.wav;*.mp3")
        if file_path then
            audio_file_name = file_path:match("([^/]+)$")
            win:GetItems().FilePath:SetText(audio_file_name)
            audio_path = file_path
            win:GetItems().InfoDisplay:SetText("Selected file: " .. audio_file_name)
            print("Audio file selected:", audio_file_name)
        end
    end

    function AnalyzeButtonClicked()
        if audio_path == "" then
            win:GetItems().InfoDisplay:SetText("Please select an audio file.")
            print("Error: No audio file selected.")
            return
        end

        print("Analyzing audio file. This may take some time depending on file length.")
        win:GetItems().InfoDisplay:SetText("Analyzing Audio... Please Wait...")
        detect_beat_and_tempo(audio_path)
        if #beat > 0 or #tempo > 0 then
            win:GetItems().InfoDisplay:SetText("Analysis complete. Ready to create markers.")
            print("Audio analysis completed. Beats detected:", #beat, "Tempos detected:", #tempo)
        else
            win:GetItems().InfoDisplay:SetText("Analysis failed.")
            print("Error: Analysis failed.")
        end
    end

    function CreateMarkersButtonClicked()
        if #beat == 0 and #tempo == 0 then
            win:GetItems().InfoDisplay:SetText("Please analyze audio before creating markers.")
            print("Error: No analysis data to create markers.")
            return
        end

        local add_beat = win:GetItems().AddBeat.Checked
        local add_tempo = win:GetItems().AddTempo.Checked
        if not add_beat and not add_tempo then
            win:GetItems().InfoDisplay:SetText("Please select at least one marker type.")
            print("Error: No marker type selected.")
            return
        end

        print("Creating markers based on selected options...")
        win:GetItems().InfoDisplay:SetText("Creating markers...")
        if add_markers(win, audio_file_name, add_beat, add_tempo) then
            win:GetItems().CreateMarkers.Text = "Markers Created"
            win:GetItems().InfoDisplay:SetText("Markers created successfully.")
            print("Markers successfully created.")
        else
            win:GetItems().InfoDisplay:SetText("Failed to create markers. Could not find matching audio clip on the timeline.")
            print("Error: Failed to create markers, audio clip not found on timeline.")
        end
    end

    -- Function to open the Buy Me a Coffee link
    function OpenCoffeeLink()
        print("Opening Buy Me a Coffee link...")
        os.execute('open "https://ko-fi.com/surebeat"')
    end

    -- Link button actions to their respective functions
    win.On.Browse.Clicked = BrowseButtonClicked
    win.On.Analyze.Clicked = AnalyzeButtonClicked
    win.On.CreateMarkers.Clicked = CreateMarkersButtonClicked
    win.On.BuyCoffee.Clicked = OpenCoffeeLink

    win.On[win.ID].Close = function(ev)
        print("Closing SureBeat plugin UI...")
        disp:ExitLoop()
    end

    win:Show()
    disp:RunLoop()
    win:Hide()
    print("SureBeat plugin terminated.")
end

main()
