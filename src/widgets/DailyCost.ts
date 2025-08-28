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

// Model pricing (as of Jan 2025)
const PRICING: Record<string, { input: number; output: number; cacheRead: number; cacheCreate: number }> = {
    opus: {
        input: 15.00 / 1_000_000,        // $15 per million input tokens
        output: 75.00 / 1_000_000,       // $75 per million output tokens
        cacheRead: 1.50 / 1_000_000,     // $1.50 per million cache read tokens
        cacheCreate: 18.75 / 1_000_000   // $18.75 per million cache creation tokens
    },
    sonnet: {
        input: 3.00 / 1_000_000,         // $3 per million input tokens
        output: 15.00 / 1_000_000,       // $15 per million output tokens
        cacheRead: 0.30 / 1_000_000,     // $0.30 per million cache read tokens
        cacheCreate: 3.75 / 1_000_000    // $3.75 per million cache creation tokens
    }
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

    private getDailyCost(): number {
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

            let totalCost = 0;

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

                            // Calculate cost based on model and usage
                            if (data.message?.usage && data.message?.model) {
                                const usage = data.message.usage;
                                const model = data.message.model;
                                
                                // Determine pricing based on model
                                let pricing = PRICING.sonnet; // Default to Sonnet
                                if (model.includes('opus')) {
                                    pricing = PRICING.opus;
                                } else if (model.includes('sonnet')) {
                                    pricing = PRICING.sonnet;
                                }
                                
                                // Calculate cost for this entry
                                const entryCost = 
                                    (usage.input_tokens || 0) * pricing.input +
                                    (usage.output_tokens || 0) * pricing.output +
                                    (usage.cache_read_input_tokens ?? 0) * pricing.cacheRead +
                                    (usage.cache_creation_input_tokens ?? 0) * pricing.cacheCreate;
                                
                                totalCost += entryCost;
                            }
                        } catch {
                            // Skip invalid JSON lines
                        }
                    }
                } catch {
                    // Skip files that can't be read
                }
            }

            return totalCost;
        } catch {
            return { inputTokens: 0, outputTokens: 0, cachedTokens: 0 };
        }
    }

    render(item: WidgetItem, context: RenderContext, settings: Settings): string | null {
        if (context.isPreview) {
            return item.rawValue ? '15' : 'Daily: $15';
        }

        // Get daily cost from all transcript files
        const totalCost = this.getDailyCost();

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