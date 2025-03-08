-- Path to SureBeat_main.luac in the same folder as SureBeat.lua
local compiledScriptPath = debug.getinfo(1, "S").source:match("@?(.*/)") .. "SureBeat_main.luac"

-- Attempt to load and execute the compiled file
local mainFunc, loadError = loadfile(compiledScriptPath)

-- Check if the file loaded successfully
if mainFunc then
    mainFunc()  -- Execute the compiled script
else
    print("Error loading SureBeat_main.luac: " .. (loadError or "Unknown error"))
end
