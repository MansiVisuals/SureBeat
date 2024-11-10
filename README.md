# SureBeat

SureBeat is a personal project maintained in my free time. If you find it useful, consider supporting further development: Donate on Ko-Fi:
[Donate on Ko-Fi](https://ko-fi.com/surebeat)


INSTALLATION:

Here’s a step-by-step guide to manually setting up SureBeat on macOS. Read it carefully.

This guide will walk you through installing all required dependencies and configuring SureBeat within DaVinci Resolve.

1. Install Dependencies

SureBeat relies on several key dependencies, including Python, FFmpeg, and madmom. Make sure you follow each step to ensure all dependencies are properly installed.

1.1 Install Python

1.	Check Python Version: SureBeat is tested with Python 3.9.6, 3.10 and 3.13, so ensure you have one of these versions installed.
```
python3 --version
```
Should return 
```
# Python 3.9.6
```
If it doesn't return anything you need to install python.

2.	Install Python (if needed, macOS should have 3.9.6 by default and you don't need to install pyhton):
   
   	•	Download from the official Python website, or alternativly install with Homebrew:

https://www.python.org/downloads/
```
brew install python
```

1.2 Install FFmpeg

1.	Check FFmpeg: Verify if FFmpeg is installed.
   
```
ffmpeg -version
```

2.	Install FFmpeg (if needed):
   
	•	Download from the official FFmpeg website (recommended), or alternativly install with Homebrew:
 
https://ffmpeg.org/download.html / https://evermeet.cx/ffmpeg/ download the binary for macOS from the website and place into /usr/local/bin

```
brew install ffmpeg
```

1.3 Install Python Packages and madmom

SureBeat requires the madmom library, along with additional libraries like numpy, scipy, and mido.
1.	Install pip packages:
   
```
pip3 install numpy scipy mido
```

2.	Install madmom:
	•	Install the specific version (0.17) of madmom from the GitHub source:
```
pip3 install git+https://github.com/CPJKU/madmom.git@main
```

2. Download SureBeat Files

	1.	Download SureBeat Files:
	•	Download SureBeat.lua and beat_detection.py from the SureBeat repository on GitHub:
	•	SureBeat.lua
	•	beat_detection.py
	2.	Create the SureBeat Directory:
	•	DaVinci Resolve expects these files in a specific folder: ""/Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Utility/Surebeat"
		Create the following directory called SureBeat if it does not already exist using finder or the command below in terminal 

```
mkdir -p "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Utility/SureBeat"
```
3.	Place Files in the Directory:
	•	Move or copy SureBeat.lua and beat_detection.py to the directory using finder or terminal command below.
 
```
cp <path/to/>SureBeat.lua "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Utility/SureBeat/"
cp <path/to/>beat_detection.py "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Utility/SureBeat/"
```
4. Verify Setup

To confirm that SureBeat is properly set up, you can perform the following checks:
	4.11	Check Python Installation:
```
python3 -c "import madmom; print(madmom.__version__)"
```
•	This should return  ```0.17.dev0```, verifying that madmom is correctly installed.


4.2	Check DaVinci Resolve Script Files:

•	Open Finder and navigate to (shift+cmd+g):

/Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Utility/SureBeat/


•	Ensure both SureBeat.lua and beat_detection.py are present.

4.3	Test the Python Script:
	•	Run the beat_detection.py script from the terminal to check if it works independently:
```
python3 "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Utility/SureBeat/beat_detection.py" <path/to/your_audio_file.mp3>
```
•	Replace path/to/your_audio_file.mp3 with an actual audio file path. This command should output beat and tempo information if everything is set up correctly.
 

5. Using SureBeat in DaVinci Resolve

	1.	Open DaVinci Resolve.
	2.	Navigate to Workspace.
	3.	Navigate to Script:
 	4.	Navigate to SureBeat
 	5.	Select SureBeat to run it.

Troubleshooting

If you encounter issues, here are a few troubleshooting steps:

•	Python Compatibility: Ensure that the Python version used matches the one installed (check with python3 --version).
 
•	Permissions: If you get permissions errors, ensure you have admin rights for placing files in /Library/Application Support/Blackmagic Design.

•	Dependency Check: Verify that all required packages are installed by running:

```
pip3 show numpy scipy mido madmom ffmpeg
```

By following these steps, SureBeat should be installed and fully functional in DaVinci Resolve on macOS!

SureBeat is provided “as-is” without warranty of any kind, express or implied. Mansi Visuals is not liable for any claims or damages arising from the use of this software or it's dependencies.

