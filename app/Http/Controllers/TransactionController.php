<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Transaction;
use App\Models\Pipeline;
use App\Models\Client;
use Inertia\Inertia;
use App\Models\PipelineStage;

class TransactionController extends Controller
{
    public function index()
    {
        return Inertia::render('Transaction/Index', [
            'transactions' => Transaction::with(['client', 'contactPerson', 'pipeline', 'items'])->latest()->get(),
        ]);
    }

    public function create()
    {
        return Inertia::render('Transaction/Create', [
            'pipelines' => Pipeline::orderBy('pipeline_name')->get(),
            'clients'   => Client::with('contactPeople')->orderBy('client_name')->get(),
        ]);
    }

    public function edit(Transaction $transaction)
    {
        return Inertia::render('Transaction/Edit', [
            'transaction' => $transaction->load(['client', 'contactPerson', 'pipeline', 'items']),
            'pipelines'   => Pipeline::orderBy('pipeline_name')->get(),
            'clients'     => Client::with('contactPeople')->orderBy('client_name')->get(),
        ]);
    }

    protected function itemRules(): array
    {
        return [
            'items'              => 'required|array|min:1',
            'items.*.item_name'  => 'required|string|max:255',
            'items.*.quantity'   => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
        ];
    }

    protected function transactionRules(): array
    {
        return array_merge([
            'name'                       => 'required|string|max:255',
            'client_id'                  => 'required|exists:clients,id',
            'client_contact_person_id'   => 'required|exists:client_contact_people,id',
            'pipeline'                   => 'required|exists:pipelines,id',
            'priority'                   => 'required|in:Low,Medium,High,Critical',
            'winning_message'            => 'nullable|string',
            'note'                       => 'nullable|string',
        ], $this->itemRules());
    }

    public function store(Request $request)
    {
        $validated = $request->validate($this->transactionRules());

        $pipeline = Pipeline::findOrFail($validated['pipeline']);

        $initialStage = $pipeline->stages()->where('is_initial', true)->first()
            ?? $pipeline->stages()->orderBy('sort_order')->first();

        $amount = collect($validated['items'])
            ->sum(fn ($item) => $item['quantity'] * $item['unit_price']);

        $transaction = Transaction::create([
            'name'                     => $validated['name'],
            'client_id'                => $validated['client_id'],
            'client_contact_person_id' => $validated['client_contact_person_id'],
            'pipeline_id'              => $pipeline->id,
            'priority'                 => $validated['priority'],
            'winning_message'          => $validated['winning_message'] ?? null,
            'note'                     => $validated['note'] ?? null,
            'amount'                   => $amount,
        ]);

        if ($initialStage) {
            $transaction->moveToStage($initialStage, auth()->id(), 'Transaction created');
        }

        foreach ($validated['items'] as $item) {
            $transaction->items()->create($item);
        }

        return redirect()->route('transactions.index');
    }

    public function update(Request $request, Transaction $transaction)
    {
        $validated = $request->validate($this->transactionRules());

        $amount = collect($validated['items'])
            ->sum(fn ($item) => $item['quantity'] * $item['unit_price']);

        $pipelineChanged = (int) $validated['pipeline'] !== $transaction->pipeline_id;

        $transaction->update([
            'name'                     => $validated['name'],
            'client_id'                => $validated['client_id'],
            'client_contact_person_id' => $validated['client_contact_person_id'],
            'pipeline_id'              => $validated['pipeline'],
            'priority'                 => $validated['priority'],
            'winning_message'          => $validated['winning_message'] ?? null,
            'note'                     => $validated['note'] ?? null,
            'amount'                   => $amount,
        ]);

        if ($pipelineChanged) {
            $newPipeline = Pipeline::find($validated['pipeline']);

            $initialStage = $newPipeline->stages()->where('is_initial', true)->first()
                ?? $newPipeline->stages()->orderBy('sort_order')->first();

            if ($initialStage) {
                $transaction->moveToStage($initialStage, auth()->id(), 'Pipeline changed');
            }
        }

        $transaction->items()->delete();
        foreach ($validated['items'] as $item) {
            $transaction->items()->create($item);
        }

        return redirect()->route('transactions.index');
    }

    public function updateStage(Request $request, Transaction $transaction)
    {
        $validated = $request->validate([
            'pipeline_stage_id' => 'required|exists:pipeline_stages,id',
        ]);

        $stage = PipelineStage::findOrFail($validated['pipeline_stage_id']);

        if ($stage->pipeline_id !== $transaction->pipeline_id) {
            return back()->withErrors([
                'pipeline_stage_id' => 'That stage does not belong to this transaction\'s pipeline.',
            ]);
        }

        $transaction->moveToStage($stage, auth()->id(), 'Moved via pipeline board');

        return back();
    }

    public function updateStatus(Request $request, Transaction $transaction)
    {
        $validated = $request->validate([
            'status' => 'required|in:won,lost',
        ]);

        $transaction->markStatus($validated['status'], auth()->id());

        return back();
    }

    public function destroy(Transaction $transaction)
    {
        $transaction->delete();

        return redirect()->route('transactions.index');
    }
}