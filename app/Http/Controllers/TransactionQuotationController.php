<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\ClientContactPerson;
use App\Models\ItemVariant;
use App\Models\Transaction;
use App\Models\TransactionVersion;
use Inertia\Inertia;

/**
 * The quotation is a document of the transaction. There is nothing to create or edit here:
 * editing happens in the transaction form, this controller lists, prints and restores.
 */
class TransactionQuotationController extends Controller
{
    /** Every transaction that has been issued a quotation number. */
    public function index()
    {
        return Inertia::render('Quotation/Index', [
            'quotations' => Transaction::with(['client', 'contactPerson', 'items', 'stage'])
                ->whereNotNull('quotation_number')
                ->latest('quotation_issued_at')
                ->get(),
        ]);
    }

    /** Printable / PDF-able view of the current version (the sent copy once the card is past the quotation stage). */
    public function print(Transaction $transaction)
    {
        abort_unless($transaction->hasQuotation(), 404);

        return Inertia::render('Quotation/Print', [
            'quotation' => $this->withPricing(
                $transaction->quotationDocument(),
                (float) $transaction->markup_percent,
                (float) $transaction->vat_percent,
                [
                    'prepared_by'          => $transaction->prepared_by,
                    'prepared_by_position' => $transaction->prepared_by_position,
                ],
            ),
        ]);
    }

    /** Printable view of an older version, rebuilt from its stored snapshot. */
    public function printVersion(Transaction $transaction, TransactionVersion $version)
    {
        abort_unless($version->transaction_id === $transaction->id, 404);

        $s = $version->snapshot;

        // Versions saved before markup/VAT existed were priced without them, so they print as 0.
        // Versions saved before "prepared by" existed fall back to the current values.
        return Inertia::render('Quotation/Print', [
            'quotation' => $this->withPricing(
                $transaction->versionDocument($version),
                (float) ($s['markup_percent'] ?? 0),
                (float) ($s['vat_percent'] ?? 0),
                [
                    'prepared_by'          => $s['prepared_by'] ?? $transaction->prepared_by,
                    'prepared_by_position' => $s['prepared_by_position'] ?? $transaction->prepared_by_position,
                ],
            ),
        ]);
    }

    /**
     * Go back to an older version. Nothing is deleted or rewritten: the old content is copied
     * into a NEW version on top (restoring -1 while at -3 creates -4 with the content of -1),
     * so the history stays intact and the restore itself can be undone the same way.
     */
    public function restore(Transaction $transaction, TransactionVersion $version)
    {
        abort_unless($version->transaction_id === $transaction->id, 404);

        if ($transaction->quotationIsFrozen()) {
            return back()->withErrors(['restore' => 'The quotation was already sent (the card is past the quotation stage). Move the card back to the quotation stage to change it.']);
        }

        if ($transaction->deliveries()->exists()) {
            return back()->withErrors(['restore' => 'Items are locked because goods were delivered, so an older version cannot be restored.']);
        }

        $s = $version->snapshot;

        // The things the old version points to must still exist.
        if (! Client::whereKey($s['client_id'] ?? null)->exists()
            || ! ClientContactPerson::whereKey($s['client_contact_person_id'] ?? null)->exists()) {
            return back()->withErrors(['restore' => 'The client or contact person of that version no longer exists.']);
        }

        $variantIds = collect($s['items'] ?? [])->pluck('item_variant_id')->unique();
        if ($variantIds->isEmpty()
            || ItemVariant::whereIn('id', $variantIds)->count() !== $variantIds->count()) {
            return back()->withErrors(['restore' => 'One or more items of that version no longer exist, so it cannot be restored.']);
        }

        $rows = collect($s['items'])->map(fn ($i) => [
            'item_variant_id' => $i['item_variant_id'],
            'item_name'       => $i['item_name'],
            'brand_name'      => $i['brand_name'],
            'quantity'        => $i['quantity'],
            'unit_price'      => $i['unit_price'],
        ])->all();

        $fields = [
            'name'                     => $s['subject'],
            'client_id'                => $s['client_id'],
            'client_contact_person_id' => $s['client_contact_person_id'],
            // Old snapshots stored remarks under "note".
            'remarks'                  => $s['remarks'] ?? $s['note'] ?? null,
            'prepared_by'              => $s['prepared_by'] ?? $transaction->prepared_by,
            'prepared_by_position'     => $s['prepared_by_position'] ?? $transaction->prepared_by_position,
            // Old snapshots have no markup/VAT: they were priced without them.
            'markup_percent'           => $s['markup_percent'] ?? 0,
            'vat_percent'              => $s['vat_percent'] ?? 0,
        ];

        if (! $transaction->saveEdit($fields, $rows, auth()->id())) {
            return back()->withErrors(['restore' => 'The current version is already identical to that one.']);
        }

        // Keep the stored amount equal to items + markup + VAT.
        $transaction->refresh()->syncAmount();

        return redirect()->route('transactions.edit', array_filter([
            'transaction' => $transaction->id,
            'from'        => request()->query('from'),
        ]));
    }

    /** Add markup/VAT (and any extra print fields) to the print data, whether the document is an array or a model. */
    private function withPricing(mixed $doc, float $markup, float $vat, array $extra = []): mixed
    {
        $extra = ['markup_percent' => $markup, 'vat_percent' => $vat] + $extra;

        if (is_array($doc)) {
            return array_merge($doc, $extra);
        }

        foreach ($extra as $key => $value) {
            $doc->{$key} = $value;
        }

        return $doc;
    }
}