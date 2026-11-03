<?php

namespace App\Support;

class PermissionLabel
{
    /**
     * "pipeline.manage" → "Manage pipeline"
     * "view_reports"    → "View reports"
     */
    public static function make(string $name): string
    {
        $parts = explode('.', $name);

        // resource.action → action resource
        if (count($parts) > 1) {
            $parts = array_reverse($parts);
        }

        $text = str_replace(['_', '-'], ' ', implode(' ', $parts));

        return ucfirst(strtolower(trim($text)));
    }
}