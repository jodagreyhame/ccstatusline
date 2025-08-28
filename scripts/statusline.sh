#!/bin/bash
# Claude Statusline - Processing time tracker with ccstatusline renderer

# Read JSON input from stdin
input=$(cat)

# Extract session ID for processing time tracking
session_id=$(echo "$input" | grep -o '"session_id":"[^"]*"' | sed 's/"session_id":"\([^"]*\)"/\1/' | head -1)
hook_event=$(echo "$input" | grep -o '"hook_event_name":"[^"]*"' | sed 's/"hook_event_name":"\([^"]*\)"/\1/' | head -1)

# Processing time tracking files
PROCESSING_TIME_FILE="/tmp/claude_processing_start_${session_id}.timestamp"
LAST_PROCESSING_TIME="/tmp/claude_last_processing_${session_id}.time"

# Track processing time
if [ "$hook_event" = "UserPromptSubmit" ]; then
    date +%s > "$PROCESSING_TIME_FILE"
elif [ "$hook_event" = "Stop" ] || [ "$hook_event" = "SubagentStop" ] || [ "$hook_event" = "SessionEnd" ]; then
    if [ -f "$PROCESSING_TIME_FILE" ]; then
        start_time=$(cat "$PROCESSING_TIME_FILE")
        current_time=$(date +%s)
        elapsed=$((current_time - start_time))
        echo "$elapsed" > "$LAST_PROCESSING_TIME"
        rm -f "$PROCESSING_TIME_FILE"
    fi
fi

# Calculate processing time display
processing_time=""
if [ -f "$PROCESSING_TIME_FILE" ]; then
    start_time=$(cat "$PROCESSING_TIME_FILE")
    current_time=$(date +%s)
    elapsed=$((current_time - start_time))
    
    if [ "$elapsed" -ge 0 ] && [ "$elapsed" -lt 3600 ]; then
        if [ "$elapsed" -lt 60 ]; then
            processing_time="${elapsed}s"
        else
            minutes=$((elapsed / 60))
            seconds=$((elapsed % 60))
            processing_time="${minutes}m${seconds}s"
        fi
    else
        processing_time="--"
    fi
elif [ -f "$LAST_PROCESSING_TIME" ]; then
    last_time=$(cat "$LAST_PROCESSING_TIME")
    if [ "$last_time" -ge 0 ]; then
        if [ "$last_time" -lt 60 ]; then
            processing_time="${last_time}s"
        else
            minutes=$((last_time / 60))
            seconds=$((last_time % 60))
            processing_time="${minutes}m${seconds}s"
        fi
    else
        processing_time="--"
    fi
else
    processing_time="--"
fi

# Map current_dir to cwd for ccstatusline
modified_input=$(echo "$input" | sed 's/"current_dir"/"cwd"/g')

# Get ccstatusline output
CCSTATUSLINE_DIR="/Users/naurium/Documents/dev-projects/apps/claude-statusline/data"
cd "$CCSTATUSLINE_DIR"
ccstatusline_output=$(echo "$modified_input" | npx tsx src/ccstatusline.ts 2>/dev/null)

# Replace the placeholder timer with actual processing time
# The config has "✨--" as placeholder, replace the "--" with actual time
final_output=$(echo "$ccstatusline_output" | sed "s/✨--/✨${processing_time}/")

echo "$final_output"