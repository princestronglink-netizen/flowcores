<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Pipeline;
use Illuminate\Support\Facades\DB;

class PipelineController extends Controller
{
    public function index()
    {
        $pipelines = Pipeline::with([
            'stages' => fn ($q) => $q->orderBy('sort_order'),
            'stages.transactions' => fn ($q) => $q->where('status', 'open')->latest(),
            'stages.transactions.client',
            'stages.transactions.items',
        ])
            ->withCount([
                'transactions as won_count' => fn ($q) => $q->where('status', 'won'),
                'transactions as lost_count' => fn ($q) => $q->where('status', 'lost'),
            ])
            ->latest()
            ->get();

        return Inertia::render('Pipeline/Index', [
            'pipelines' => $pipelines,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'pipeline_code'              => 'required|string|max:255|unique:pipelines,pipeline_code',
            'pipeline_name'              => 'required|string|max:255',
            'pipeline_description'       => 'nullable|string',
            'stages'                     => 'required|array|min:1',
            'stages.*.id'                => 'nullable|integer',
            'stages.*.stage_code'        => 'required|string|max:255|distinct',
            'stages.*.stage_name'        => 'required|string|max:255',
            'stages.*.stage_description' => 'nullable|string|max:255',
        ]);

        DB::transaction(function () use ($validated) {
            $pipeline = Pipeline::create([
                'pipeline_code'         => $validated['pipeline_code'],
                'pipeline_name'         => $validated['pipeline_name'],
                'pipeline_description'  => $validated['pipeline_description'] ?? null,
            ]);

            $this->syncStages($pipeline, $validated['stages']);
        });

        return redirect()->back();
    }

    private function syncStages(Pipeline $pipeline, array $stages): void
    {
        $last       = count($stages) - 1;
        $keptIds    = [];

        foreach ($stages as $index => $stage) {
            $attributes = [
                'stage_code'            => $stage['stage_code'],
                'stage_name'            => $stage['stage_name'],
                'stage_description'     => $stage['stage_description'] ?? null,
                'sort_order'            => $index,
                'is_initial'            => $index === 0,
                'is_final'              => $index === $last,
            ];

            $existing = ! empty($stage['id'])
                ? $pipeline->stages()->find($stage['id'])
                : null;

            if ($existing) {
                $existing->update($attributes);
                $keptIds[] = $existing->id;
            } else {
                $keptIds[] = $pipeline->stages()->create($attributes)->id;
            }
        }

        $pipeline->stages()->whereNotIn('id', $keptIds)->delete();
    }
}
