<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\Request;

trait ResolvesPerPage
{
    /** Allowed page sizes. Anything else falls back to the default (never trust the URL). */
    protected function perPage(Request $request, int $default = 15): int
    {
        $value = $request->integer('per_page');

        return in_array($value, [10, 15, 25, 50, 100], true) ? $value : $default;
    }
}