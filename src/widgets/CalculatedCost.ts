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

export class CalculatedCostWidget implements Widget {
    getDefaultColor(): string { return 'green'; }
    getDescription(): string { return 'Shows calculated cost from actual token usage'; }
    getDisplayName(): string { return 'Calculated Cost'; }
    getEditorDisplay(item: WidgetItem): WidgetEditorDisplay {
        return { displayText: this.getDisplayName() };
    }

    render(item: WidgetItem, context: RenderContext, settings: Settings): string | null {
        if (context.isPreview) {
            return item.rawValue ? '3' : 'Cost: $3';
        }

        // Calculate cost from token metrics
        if (!context.tokenMetrics) {
            return null;
        }

        const { inputTokens, outputTokens, cachedTokens } = context.tokenMetrics;
        
        // Calculate total cost
        // Note: cachedTokens includes both cache read and creation, assume mostly reads
        const inputCost = inputTokens * PRICING.input;
        const outputCost = outputTokens * PRICING.output;
        const cachedCost = cachedTokens * PRICING.cacheRead; // Assume mostly cache reads
        const totalCost = inputCost + outputCost + cachedCost;

        // Format cost based on magnitude
        let formattedCost: string;
        if (totalCost < 0.01) {
            // Less than 1 cent, show as <0.01
            formattedCost = '<0.01';
        } else if (totalCost < 1) {
            // Less than $1, show cents with 2 decimal places
            formattedCost = totalCost.toFixed(2);
        } else if (totalCost < 10) {
            // Less than $10, show with 1 decimal place
            formattedCost = totalCost.toFixed(1);
        } else {
            // $10 or more, round to nearest dollar
            formattedCost = Math.round(totalCost).toString();
        }

        return item.rawValue ? formattedCost : `Cost: $${formattedCost}`;
    }

    supportsRawValue(): boolean { return true; }
    supportsColors(item: WidgetItem): boolean { return true; }
}