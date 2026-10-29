<?php

namespace App\Http\Controllers;

use App\Models\Client;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ClientController extends Controller
{
    public function index()
    {
        return Inertia::render('Client/Index', [
            'clients' => Client::with('contactPeople')->latest()->get(),
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
        $client->delete();

        return redirect()->back();
    }

    public function quickStore(Request $request)
    {
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

    public function quickStoreContact(Request $request, Client $client)
    {
        $validated = $request->validate($this->contactRules());

        return response()->json($client->contactPeople()->create($validated));
    }
}