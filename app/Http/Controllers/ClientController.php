<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Client;
use Inertia\Inertia;

class ClientController extends Controller
{
    public function index(Client $client)
    {
        return Inertia::render('Client/Index', [
            'clients' => Client::with('contactPeople')->latest()->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_code'               => 'required|string|max:255|unique:clients,client_code',
            'client_name'               => 'required|string|max:255',
            'contacts'                  => 'required|array|min:1',
            'contacts.*.contact_person' => 'required|string|max:255',
            'contacts.*.contact_number' => 'nullable|string|max:255',
            'contacts.*.email'          => 'nullable|email|max:255',
        ]);

        $client = Client::create([
            'client_code' => $validated['client_code'],
            'client_name' => $validated['client_name'],
        ]);

        foreach ($validated['contacts'] as $contact) {
            $client->contactPeople()->create($contact);
        }

        return redirect()->back();
    }

    public function update(Request $request, Client $client)
    {
        $validated = $request->validate([
            'client_code'               => 'required|string|max:255|unique:clients,client_code,' . $client->id,
            'client_name'               => 'required|string|max:255',
            'contacts'                  => 'required|array|min:1',
            'contacts.*.contact_person' => 'required|string|max:255',
            'contacts.*.contact_number' => 'nullable|string|max:255',
            'contacts.*.email'          => 'nullable|email|max:255',
        ]);

        $client->update([
            'client_code' => $validated['client_code'],
            'client_name' => $validated['client_name'],
        ]);

        // simplest approach: wipe old contacts, recreate from the submitted list
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
    
}
