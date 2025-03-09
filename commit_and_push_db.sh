#!/bin/bash

# Path to the database file
DB_FILE="/home/lsadmin/SureBeat/SureBeat-Servers/license_server/database.db"

# Path to the Git repository
REPO_PATH="/home/lsadmin/SureBeat/SureBeat-Servers"

# Log file path
LOG_FILE="/home/lsadmin/SureBeat/SureBeat-Servers/commit_and_push_db.log"

# Function to log messages with timestamps
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOG_FILE
}

# Function to commit and push changes
commit_and_push() {
    cd $REPO_PATH

    log_message "Starting commit and push process."

    # Force add changes to git
    git add -f $DB_FILE
    log_message "Force added $DB_FILE to staging area."

    # Check if there are any changes to commit
    if git diff-index --quiet HEAD --; then
        log_message "No changes to commit."
    else
        # Commit changes with a message
        git commit -m "Automated commit: $(date)"
        log_message "Committed changes."

        # Force push changes to GitHub
        if git push -f origin main; then
            log_message "Force pushed changes to GitHub."
        else
            log_message "Failed to push changes to GitHub."
        fi
    fi

    log_message "Finished commit and push process."
}

# Call the function to commit and push changes
commit_and_push
