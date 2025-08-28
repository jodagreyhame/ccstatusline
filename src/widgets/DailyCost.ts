import * as fs from 'fs';
import path from 'node:path';
import { globSync } from 'tinyglobby';

import type { RenderContext } from '../types/RenderContext';
import type { Settings } from '../types/Settings';
import type {
    Widget,
    WidgetEditorDisplay,
    WidgetItem
} from '../types/Widget';

// Claude Opus 4 pricing (as of Jan 2025)
const PRICING = {
    input: 15.00 / 1_000_000,        // $15 per million input tokens
    output: 75.00 / 1_000_000,       // $75 per million output tokens
    cacheRead: 1.50 / 1_000_000,     // $1.50 per million cache read tokens
    cacheCreate: 18.75 / 1_000_000   // $18.75 per million cache creation tokens (25% more than input)
};

interface TranscriptLine {
    timestamp?: string;
    message?: {
        usage?: {
            input_tokens?: number;
            output_tokens?: number;
            cache_read_input_tokens?: number;
            cache_creation_input_tokens?: number;
        };
    };
}

export class DailyCostWidget implements Widget {
    getDefaultColor(): string { return 'yellow'; }
    getDescription(): string { return 'Shows total cost for today from all projects'; }
    getDisplayName(): string { return 'Daily Cost'; }
    getEditorDisplay(item: WidgetItem): WidgetEditorDisplay {
        return { displayText: this.getDisplayName() };
    }

    private getDailyTokens(): { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheCreateTokens: number } {
        try {
            // Find .claude folder
            const claudePath = path.join(process.env.HOME || '', '.claude');
            if (!fs.existsSync(claudePath)) {
                return { inputTokens: 0, outputTokens: 0, cachedTokens: 0 };
            }

            // Get all JSONL files
            const pattern = path.join(claudePath, 'projects', '**', '*.jsonl').replace(/\\/g, '/');
            const files = globSync([pattern]);

            // Get today's start time (midnight)
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const todayStartTime = todayStart.getTime();

            let inputTokens = 0;
            let outputTokens = 0;
            let cacheReadTokens = 0;
            let cacheCreateTokens = 0;

            // Process each file
            for (const file of files) {
                try {
                    const content = fs.readFileSync(file, 'utf-8');
                    const lines = content.trim().split('\n').filter(line => line.length > 0);

                    for (const line of lines) {
                        try {
                            const data = JSON.parse(line) as TranscriptLine;
                            
                            // Check if this entry is from today
                            if (data.timestamp) {
                                const entryTime = new Date(data.timestamp).getTime();
                                if (entryTime < todayStartTime) {
                                    continue; // Skip entries before today
                                }
                            }

                            // Sum up token usage
                            if (data.message?.usage) {
                                inputTokens += data.message.usage.input_tokens || 0;
                                outputTokens += data.message.usage.output_tokens || 0;
                                cacheReadTokens += data.message.usage.cache_read_input_tokens ?? 0;
                                cacheCreateTokens += data.message.usage.cache_creation_input_tokens ?? 0;
                            }
                        } catch {
                            // Skip invalid JSON lines
                        }
                    }
                } catch {
                    // Skip files that can't be read
                }
            }

            return { inputTokens, outputTokens, cacheReadTokens, cacheCreateTokens };
        } catch {
            return { inputTokens: 0, outputTokens: 0, cachedTokens: 0 };
        }
    }

    render(item: WidgetItem, context: RenderContext, settings: Settings): string | null {
        if (context.isPreview) {
            return item.rawValue ? '15' : 'Daily: $15';
        }

        // Calculate daily cost from all transcript files
        const { inputTokens, outputTokens, cacheReadTokens, cacheCreateTokens } = this.getDailyTokens();
        
        // Calculate total cost
        const inputCost = inputTokens * PRICING.input;
        const outputCost = outputTokens * PRICING.output;
        const cacheReadCost = cacheReadTokens * PRICING.cacheRead;
        const cacheCreateCost = cacheCreateTokens * PRICING.cacheCreate;
        const totalCost = inputCost + outputCost + cacheReadCost + cacheCreateCost;

        // Format cost based on magnitude
        let formattedCost: string;
        if (totalCost < 0.01) {
            formattedCost = '<0.01';
        } else if (totalCost < 1) {
            formattedCost = totalCost.toFixed(2);
        } else if (totalCost < 10) {
            formattedCost = totalCost.toFixed(1);
        } else {
            formattedCost = Math.round(totalCost).toString();
        }

        return item.rawValue ? formattedCost : `Daily: $${formattedCost}`;
    }

    supportsRawValue(): boolean { return true; }
    supportsColors(item: WidgetItem): boolean { return true; }
}