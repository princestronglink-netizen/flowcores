<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesPerPage;
use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

/**
 * PERMISSIONS (ClientPolicy):
 *   index                 -> viewAny (client.view)
 *   store, quickStore     -> create  (client.create)
 *   update, quickStoreContact -> update (client.edit)
 *   destroy               -> delete  (client.delete)
 */
class ClientController extends Controller
{
    use ResolvesPerPage;

    public function index(Request $request)
    {
        Gate::authorize('viewAny', Client::class);

        $search  = trim($request->string('search')->toString());
        $perPage = $this->perPage($request);

        return Inertia::render('Client/Index', [
            'clients' => Client::with('contactPeople')
                ->when($search !== '', function ($q) use ($search) {
                    $like = '%' . addcslashes($search, '%_\\') . '%';

                    $q->where(function ($q) use ($like) {
                        $q->where('client_name', 'like', $like)
                            ->orWhere('address', 'like', $like)
                            ->orWhereHas('contactPeople', function ($c) use ($like) {
                                $c->where('contact_person', 'like', $like)
                                    ->orWhere('contact_number', 'like', $like)
                                    ->orWhere('email', 'like', $like);
                            });
                    });
                })
                ->latest()
                ->latest('id')
                ->paginate($perPage)
                ->withQueryString(),
            'filters' => ['search' => $search, 'per_page' => $perPage],
            // Lets the page tell "no clients at all" apart from "no search match".
            'hasAny'  => Client::exists(),
        ]);
    }

    protected function contactRules(): array
    {
        return [
            'contact_person' => 'required|string|max:255',
            'contact_number' => 'nullable|string|max:255',
            'email'          => 'nullable|email|max:255',
        ];
    }

    protected function clientRules(): array
    {
        return [
            'client_name' => 'required|string|max:255',
            'address'     => 'nullable|string|max:500',
        ];
    }

    public function store(Request $request)
    {
        Gate::authorize('create', Client::class);

        $validated = $request->validate($this->clientRules() + [
            'contacts'                  => 'required|array|min:1',
            'contacts.*.contact_person' => 'required|string|max:255',
            'contacts.*.contact_number' => 'nullable|string|max:255',
            'contacts.*.email'          => 'nullable|email|max:255',
        ]);

        $client = Client::create([
            'client_name' => $validated['client_name'],
            'address'     => $validated['address'] ?? null,
        ]);

        foreach ($validated['contacts'] as $contact) {
            $client->contactPeople()->create($contact);
        }

        return redirect()->back();
    }

    public function update(Request $request, Client $client)
    {
        Gate::authorize('update', $client);

        $validated = $request->validate($this->clientRules() + [
            'contacts'                  => 'required|array|min:1',
            'contacts.*.contact_person' => 'required|string|max:255',
            'contacts.*.contact_number' => 'nullable|string|max:255',
            'contacts.*.email'          => 'nullable|email|max:255',
        ]);

        $client->update([
            'client_name' => $validated['client_name'],
            'address'     => $validated['address'] ?? null,
        ]);

        // Wipe and recreate. Note: this changes contact IDs, see the warning below.
        $client->contactPeople()->delete();
        foreach ($validated['contacts'] as $contact) {
            $client->contactPeople()->create($contact);
        }

        return redirect()->back();
    }

    public function destroy(Client $client)
    {
        Gate::authorize('delete', $client);

        $client->delete();

        return redirect()->back();
    }

    /** Quick-add a client (with its first contact) from inside a form. Needs client.create. */
    public function quickStore(Request $request)
    {
        Gate::authorize('create', Client::class);

        $validated = $request->validate($this->clientRules() + $this->contactRules());

        $client = Client::create([
            'client_name' => $validated['client_name'],
            'address'     => $validated['address'] ?? null,
        ]);

        $client->contactPeople()->create([
            'contact_person' => $validated['contact_person'],
            'contact_number' => $validated['contact_number'] ?? null,
            'email'          => $validated['email'] ?? null,
        ]);

        return response()->json($client->load('contactPeople'));
    }

    /** Quick-add a contact person to an existing client from inside a form. Needs client.edit. */
    public function quickStoreContact(Request $request, Client $client)
    {
        Gate::authorize('update', $client);

        $validated = $request->validate($this->contactRules());

        return response()->json($client->contactPeople()->create($validated));
    }
}