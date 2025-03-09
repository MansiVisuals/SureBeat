# SureBeat User Manual

## Table of Contents
1. Introduction
2. Installation
3. Privacy Statement
4. Licensing
5. Basic Usage
6. Advanced Settings
7. Understanding Beat vs Tempo Markers
8. Troubleshooting

## Introduction

SureBeat by MansiVisuals is a specialized audio analysis tool for DaVinci Resolve that detects beats and tempo in audio clips, allowing you to create precisely timed markers for editing to music.

## Installation

### Installation Location

#### macOS
```
/Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Utility/SureBeat/
```

#### Windows
```
C:\ProgramData\Blackmagic Design\DaVinci Resolve\Fusion\Scripts\Utility\SureBeat\
```

**Important:** Move the complete SureBeat folder with all its contents to the appropriate location for your operating system. Do not separate or rearrange the files inside the SureBeat folder as this may cause the application to malfunction.

### Security Settings

#### For macOS Users (Gatekeeper)
When first launching SureBeat on macOS, you may encounter security warnings:

1. If you see "SureBeat can't be opened because it is from an unidentified developer":
   - Right-click (or Control-click) on the SureBeat application
   - Select "Open" from the context menu
   - Click "Open" in the dialog box that appears

2. If you see "SureBeat was blocked from use because it is not from an identified developer":
   - Go to System Preferences/Settings > Security & Privacy > General
   - Look for the message about SureBeat being blocked
   - Click "Open Anyway" or "Allow"

3. Making the Binary Executable (Terminal):
   ```bash
   chmod +x "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Utility/SureBeat/SureBeat"
   ```

#### For Windows Users
When first launching SureBeat on Windows, you may encounter security warnings:

1. If you see "Windows protected your PC":
   - Click "More info"
   - Click "Run anyway"

2. If Windows Defender SmartScreen blocks the application:
   - Click "More options" 
   - Select "Run anyway"

## Privacy Statement

SureBeat by MansiVisuals respects your privacy and is committed to transparency regarding the data we collect and how it is used. This privacy statement outlines our practices concerning data collection, storage, and processing.

SureBeat requires minimal data collection to function properly, primarily for license validation and to provide its core audio analysis features. We collect only what is necessary to deliver our services and improve your experience.

As a product developed under Dutch jurisdiction, SureBeat complies with European General Data Protection Regulation (GDPR) and Dutch privacy laws, providing you with control over your personal information.

Below you'll find detailed information about what data we collect, how we use it, and the rights you have regarding your information.

### Data Collection
SureBeat collects and processes the following information:

- **Email address**: The email address you provided during purchase on Ko-fi. This is stored solely for license tracking purposes.
- **Device Identifier**: A unique identifier created by hashing your device's hardware UUID
- **License Key**: Your purchased license key or trial status
- **Audio Analysis**: Temporary analysis data from audio clips you select
- **User Settings**: Your preferences for marker colors, beat pattern settings, etc.

### Data Rights
Under Dutch and European laws (GDPR), you have the right to:
- Request access to your personal data
- Request correction or deletion of your data
- Restrict or object to processing of your data
- Data portability

To exercise these rights or request data removal, please contact MansiVisuals at surebeat@mansivisuals.com.

### Data Usage
- **License Verification**: Your device identifier and license key are sent to MansiVisuals servers to validate your license
- **Audio Analysis**: Audio file paths are processed locally to detect beats and tempo
- **Update Checking**: Version information is sent to MansiVisuals servers when checking for updates

### Data Storage
- License information is stored locally in `activation.key`
- Analysis cache is stored locally in `analysis_cache.json`
- User settings are stored locally in `user_settings.json`

We do not sell or share your personal information with third parties beyond what is necessary for license validation and software updates.

## Licensing

SureBeat offers two licensing options:

### Trial License
- 7-day trial period
- Requires online activation
- Limited to the device where it was activated
- Validated through MansiVisuals servers

### Full License
- One-time purchase through Ko-fi
- Requires online activation
- Usage limits depend on your specific license terms
- Validated through MansiVisuals licensing system

## Basic Usage

1. **Select an audio clip** from the dropdown menu
2. **Choose marker types** by checking "Add Beat Markers" and/or "Add Tempo Markers"
3. **Click "Analyze Audio"** to process the selected clip
4. **Click "Create Markers"** after analysis to add markers to your timeline
5. **Access Advanced Settings** to customize marker colors, beat patterns, and other options

## Advanced Settings

### Unified Audio Clip Actions
When enabled, this setting provides two powerful features:
- **Filters duplicate audio clips** from the dropdown menu, showing only one entry per unique audio file
- **Adds markers to all instances** of the same audio file across your timeline
- **Use case:** Perfect for music videos or multi-camera edits where the same audio track appears multiple times

### Save Analysis
- **When enabled:** SureBeat stores analysis results in a cache file, allowing instant marker creation without re-analyzing the same audio
- **When disabled:** Analysis results are discarded after use, saving disk space but requiring re-analysis each time
- **Performance impact:** Enabling this can significantly speed up your workflow when working with the same audio files repeatedly

### Downbeat Pattern
- **When enabled:** The first beat of each measure appears in your selected color while subsequent beats appear in white
- **When disabled:** All beat markers use the same color
- **Use case:** Ideal for visualizing the musical structure when editing to rhythm

### Beats in Measure (2-12)
- Determines how many beats constitute one complete musical measure (only available when Downbeat Pattern is enabled)
- Common settings:
  - **4** for most pop, rock, and electronic music (4/4 time)
  - **3** for waltz, some folk music (3/4 time)
  - **6** for some dance music (6/8 time)
  - **2** for march-style music (2/4 time)

### Exclude Tracks
- Allows you to exclude specific audio tracks from analysis using comma-separated track numbers
- **Example:** Entering "1,3,5" will exclude audio tracks 1, 3, and 5 from the analysis
- **Use case:** Useful when you have dialogue or sound effects that you don't want to analyze for beat markers

### Choose Marker Colors
- Select from 16 different colors for both tempo and beat markers
- **Tip:** Choose contrasting colors to easily distinguish between different marker types

### Saving and Managing Settings
- **Save Settings**: Click the "Save Settings" button to store your current configuration locally
- **Load Settings**: Your saved settings will automatically load each time you start SureBeat
- **Reset to Default**: Click "Reset Settings" to restore factory default configuration
- **Use case**: Save time by preserving your preferred marker colors, beat patterns, and analysis preferences between sessions
## Understanding Beat vs Tempo Markers

### Beat Markers
- **What they are:** Individual audio onset points detection
- **What they represent:** Any significant audio event including percussion hits, note onsets, or sudden volume changes
- **Best for:** Precise timing of cuts, effects, or animations to specific sounds in the audio

### Tempo Markers
- **What they are:** Consistent rhythmic pulses detection
- **What they represent:** The underlying musical rhythm/pulse that maintains consistent timing (60-180 BPM range)
- **Best for:** Establishing a consistent editing rhythm that follows the musical structure

### When to Use Each

**Use Beat Markers when:**
- You need precise synchronization with every drum hit or sound effect
- Working with complex, dynamically changing music
- Creating tightly synchronized visual effects that match specific sounds

**Use Tempo Markers when:**
- You want a consistent editing rhythm that follows the musical pulse
- Working with traditional music where maintaining the musical meter is important
- Creating edits that follow the underlying musical structure rather than individual sounds

## Troubleshooting

### Security Issues

#### macOS
- **Problem**: "SureBeat cannot be opened because the developer cannot be verified"
  - Follow the Gatekeeper instructions in the Installation section
  - If still blocked, try: `sudo xattr -rd com.apple.quarantine "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Utility/SureBeat"`

- **Problem**: "SureBeat binary not executing"
  - Make the binary executable using the Terminal command in the Installation section
  - Verify you have the correct permissions to access the application folder

#### Windows
- **Problem**: "Windows protected your PC" message persists
  - Right-click on the executable, select Properties, check "Unblock" under the Security section
  - Temporarily disable antivirus software while installing

- **Problem**: File access issues
  - Ensure you're running DaVinci Resolve with administrator privileges
  - Check permissions on the SureBeat folder

### License Activation Issues

**Problem**: "Activation failed" message appears
- Ensure you have an active internet connection
- Verify your license key is entered correctly with no extra spaces
- Check if your license has reached its device limit
- Try restarting DaVinci Resolve and your computer

**Problem**: Trial expired but you need more time
- Contact MansiVisuals support for trial extension options

### Audio Analysis Issues

**Problem**: No beats or tempo detected
- Ensure the audio file is not corrupt
- Try a different audio file with clear beats
- Check if the SureBeat binary is executable

**Problem**: "Failed to create markers" message
- Verify you've selected the correct timeline and track
- Check if you have permission to modify the timeline
- Ensure DaVinci Resolve is not in read-only mode

### Technical Issues

**Problem**: Temporary files issues
- Clear the analysis cache using the "Remove Analysis Cache" button in Advanced Settings
- Check write permissions to the SureBeat folder

### Network Issues

**Problem**: Unable to connect to server
- Check your internet connection
- Temporarily disable firewall or security software
- Try connecting through a different network

For additional support, please contact MansiVisuals at surebeat@mansivisuals.com or visit our website at https://mansivisuals.com or https://ko-fi.com/surebeat.

---

© 2025 MansiVisuals. All rights reserved.
SureBeat version 3.0.0
