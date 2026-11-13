<?php

namespace App\Http\Controllers;

use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\Transaction;
use App\Models\TransactionStageHistory;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        // Which sections this user may see.
        $can = [
            'deals'   => $user->can('viewAny', Pipeline::class),
            'amounts' => $user->can('amounts.view'),
            'stock'   => $user->can('viewAny', Item::class),
        ];

        return Inertia::render('Dashboard', [   // resources/js/Pages/Dashboard.jsx
            'can'      => $can,
            'deals'    => $can['deals'] ? $this->deals($can['amounts']) : null,
            'stock'    => $can['stock'] ? $this->stock() : null,
            'activity' => $can['deals'] ? $this->activity() : [],
        ]);
    }

    /** Open transactions that stayed longer than their stage's max_days. */
    private function overdueQuery()
    {
        return Transaction::query()
            ->select('transactions.*')
            ->join('pipeline_stages', 'pipeline_stages.id', '=', 'transactions.pipeline_stage_id')
            ->where('transactions.status', 'open')
            ->whereNotNull('pipeline_stages.max_days')
            ->whereNotNull('transactions.stage_entered_at')
            ->whereRaw(
                'DATE_ADD(transactions.stage_entered_at, INTERVAL pipeline_stages.max_days DAY) < ?',
                [now()]
            );
    }

    private function deals(bool $withAmounts): array
    {
        $monthStart = now()->startOfMonth();

        // ---- Totals ----
        $open = Transaction::where('status', 'open');

        $openCount     = (clone $open)->count();
        $pipelineValue = $withAmounts ? (float) (clone $open)->sum('amount') : null;

        // No "won_at" column exists, so "this month" uses updated_at of won/lost deals.
        $won  = Transaction::where('status', 'won')->where('updated_at', '>=', $monthStart);
        $lost = Transaction::where('status', 'lost')->where('updated_at', '>=', $monthStart);

        $wonCount  = (clone $won)->count();
        $wonValue  = $withAmounts ? (float) (clone $won)->sum('amount') : null;
        $lostCount = (clone $lost)->count();

        // ---- Overdue ----
        $overdueCount = $this->overdueQuery()->count();

        $overdueByStage = $this->overdueQuery()
            ->select('transactions.pipeline_stage_id', DB::raw('COUNT(*) as cnt'))
            ->groupBy('transactions.pipeline_stage_id')
            ->pluck('cnt', 'pipeline_stage_id');

        $overdueList = $this->overdueQuery()
            ->with(['client:id,client_name', 'stage:id,stage_name,max_days'])
            ->orderBy('transactions.stage_entered_at')
            ->limit(6)
            ->get()
            ->map(function (Transaction $t) {
                $deadline = Carbon::parse($t->stage_entered_at)->addDays($t->stage->max_days);

                return [
                    'id'        => $t->id,
                    'name'      => $t->name ?: ($t->quotation_number ?: 'Deal #'.$t->id),
                    'client'    => $t->client?->client_name,
                    'stage'     => $t->stage?->stage_name,
                    'days_over' => max(1, (int) floor($deadline->diffInDays(now()))),
                    'priority'  => $t->priority,
                ];
            })
            ->values();

        // ---- Deals per stage ----
        $openByStage = Transaction::where('status', 'open')
            ->select('pipeline_stage_id', DB::raw('COUNT(*) as cnt'))
            ->groupBy('pipeline_stage_id')
            ->pluck('cnt', 'pipeline_stage_id');

        $stages = PipelineStage::orderBy('pipeline_id')
            ->orderBy('sort_order')
            ->get()
            ->map(fn (PipelineStage $s) => [
                'id'      => $s->id,
                'name'    => $s->stage_name,
                'count'   => (int) ($openByStage[$s->id] ?? 0),
                'overdue' => (int) ($overdueByStage[$s->id] ?? 0),
            ])
            ->values();

        return [
            'open_count'     => $openCount,
            'overdue_count'  => $overdueCount,
            'pipeline_value' => $pipelineValue,
            'won_count'      => $wonCount,
            'won_value'      => $wonValue,
            'lost_count'     => $lostCount,
            'stages'         => $stages,
            'overdue'        => $overdueList,
        ];
    }

    private function stock(): array
    {
        // stock_status / reorder_point are model accessors, so variants are checked in PHP.
        $variants = ItemVariant::with('brand.item')->get();

        $rows = $variants
            ->map(function (ItemVariant $v) {
                $reorder = (int) $v->reorder_point;
                $stock   = (int) $v->stock;

                $status = $stock <= 0 ? 'out' : ($stock <= $reorder ? 'low' : 'ok');

                return [
                    'id'            => $v->id,
                    'item'          => $v->brand?->item?->item_name,
                    'brand'         => $v->brand?->brand_name,
                    'label'         => $v->label,
                    'stock'         => $stock,
                    'reorder_point' => $reorder,
                    'status'        => $status,
                ];
            })
            ->filter(fn ($r) => $r['status'] !== 'ok');

        return [
            'out_count' => $rows->where('status', 'out')->count(),
            'low_count' => $rows->where('status', 'low')->count(),
            // out of stock first, then lowest stock
            'restock'   => $rows->sortBy([['status', 'desc'], ['stock', 'asc']])->take(8)->values(),
        ];
    }

    private function activity(): array
    {
        return TransactionStageHistory::with([
                'transaction:id,name,quotation_number',
                'stage:id,stage_name',
                'changedBy:id,name',
            ])
            ->latest()
            ->limit(8)
            ->get()
            ->map(fn (TransactionStageHistory $h) => [
                'id'          => $h->id,
                'transaction' => $h->transaction
                    ? ($h->transaction->name ?: ($h->transaction->quotation_number ?: 'Deal #'.$h->transaction->id))
                    : null,
                'stage'       => $h->stage?->stage_name,
                'note'        => $h->note,
                'at'          => $h->created_at?->toIso8601String(),
                'by'          => $h->changedBy?->name,
            ])
            ->all();
    }
}