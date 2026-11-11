<?php

use App\Models\Client;
use App\Models\ClientContactPerson;
use Illuminate\Support\Facades\DB;

/*
 * client name => [ address, [ [contact person, contact number, email], ... ] ]
 * Number and email can be null.
 */
$clients = [
    'Santos Construction Corp.' => ['123 Rizal Ave., Santa Rosa, Laguna', [
        ['Roberto Santos', '0917 123 4567', 'roberto@santosconstruction.test'],
        ['Maria Santos', '0918 234 5678', 'purchasing@santosconstruction.test'],
    ]],
    'Reyes Hardware & Supply' => ['45 National Highway, Calamba, Laguna', [
        ['Jose Reyes', '0920 345 6789', 'jose@reyeshardware.test'],
    ]],
    'Dela Cruz Builders Inc.' => ['88 Mabini St., Biñan, Laguna', [
        ['Antonio Dela Cruz', '0921 456 7890', 'antonio@delacruzbuilders.test'],
        ['Carla Mendoza', '0922 567 8901', 'carla@delacruzbuilders.test'],
        ['Ramon Villanueva', '0923 678 9012', null],
    ]],
    'Garcia Electrical Services' => ['12 Bonifacio St., Cabuyao, Laguna', [
        ['Luis Garcia', '0915 789 0123', 'luis@garciaelectrical.test'],
    ]],
    'Bautista Realty Development' => ['Unit 5, Paseo Commercial Center, Santa Rosa, Laguna', [
        ['Elena Bautista', '0916 890 1234', 'elena@bautistarealty.test'],
        ['Marco Aquino', '0917 901 2345', 'marco@bautistarealty.test'],
    ]],
    'Mendoza Plumbing Works' => ['27 Pioneer Ave., San Pedro, Laguna', [
        ['Pedro Mendoza', '0918 012 3456', null],
    ]],
    'Torres Engineering Corp.' => ['Lot 9 Block 3, Laguna Technopark, Biñan, Laguna', [
        ['Engr. Daniel Torres', '0919 123 4560', 'daniel@torreseng.test'],
        ['Katrina Lim', '0920 234 5671', 'katrina@torreseng.test'],
    ]],
    'Villanueva Trading' => ['64 Quezon Ave., Lipa City, Batangas', [
        ['Gloria Villanueva', '0921 345 6782', 'gloria@villanuevatrading.test'],
    ]],
    'Ramos Interior Design' => ['3rd Floor, Ayala Malls, Alabang, Muntinlupa', [
        ['Isabel Ramos', '0922 456 7893', 'isabel@ramosinterior.test'],
        ['Paolo Cruz', '0923 567 8904', 'paolo@ramosinterior.test'],
    ]],
    'Aquino Contractors' => ['19 San Jose St., Tanauan, Batangas', [
        ['Benjamin Aquino', '0915 678 9015', 'ben@aquinocontractors.test'],
    ]],
    'Navarro Steel & Fabrication' => ['Km 45 South Superhighway, Calamba, Laguna', [
        ['Fernando Navarro', '0916 789 0126', 'fernando@navarrosteel.test'],
        ['Liza Navarro', '0917 890 1237', 'liza@navarrosteel.test'],
        ['Jun Castillo', '0918 901 2348', null],
    ]],
    'Castillo Homes Inc.' => ['Sampaguita St., Villa Rosa Subd., Santa Rosa, Laguna', [
        ['Teresa Castillo', '0919 012 3459', 'teresa@castillohomes.test'],
    ]],
    'Domingo Agri-Supply' => ['5 Poblacion, Los Baños, Laguna', [
        ['Rodrigo Domingo', '0920 123 4561', 'rodrigo@domingoagri.test'],
    ]],
    'Fernandez Marine Works' => ['Pier 3, Batangas City, Batangas', [
        ['Capt. Ernesto Fernandez', '0921 234 5672', 'ernesto@fernandezmarine.test'],
        ['Angela Reyes', '0922 345 6783', 'angela@fernandezmarine.test'],
    ]],
    'Lopez Property Management' => ['Level 2, SM City Santa Rosa, Laguna', [
        ['Cynthia Lopez', '0923 456 7894', 'cynthia@lopezpm.test'],
    ]],
    'Morales Roofing Systems' => ['72 Mamplasan Rd., Biñan, Laguna', [
        ['Gregorio Morales', '0915 567 8905', null],
        ['Noel Morales', '0916 678 9016', 'noel@moralesroofing.test'],
    ]],
    'Pascual Glass & Aluminum' => ['14 Real St., Calamba, Laguna', [
        ['Helen Pascual', '0917 789 0127', 'helen@pascualglass.test'],
    ]],
    'Salazar Tile Center' => ['101 Diversion Rd., San Pablo, Laguna', [
        ['Manuel Salazar', '0918 890 1238', 'manuel@salazartile.test'],
    ]],
    'Ocampo Industrial Supply' => ['Phase 2, First Cavite Industrial Estate, Dasmariñas, Cavite', [
        ['Rafael Ocampo', '0919 901 2349', 'rafael@ocampoindustrial.test'],
        ['Jenny Tan', '0920 012 3450', 'jenny@ocampoindustrial.test'],
    ]],
    'Flores Electrical & Lighting' => ['38 Gen. Luna St., Sta. Cruz, Laguna', [
        ['Victor Flores', '0921 123 4562', 'victor@floreslighting.test'],
    ]],
    'Cruz Architectural Studio' => ['Unit 12, Greenfield City, Santa Rosa, Laguna', [
        ['Arch. Patricia Cruz', '0922 234 5673', 'patricia@cruzarchitects.test'],
        ['Mark Soriano', '0923 345 6784', 'mark@cruzarchitects.test'],
    ]],
    'Gonzales Cement Depot' => ['9 Provincial Rd., Cabuyao, Laguna', [
        ['Alfredo Gonzales', '0915 456 7895', null],
    ]],
    'Rivera Waterworks' => ['56 Maharlika Hwy, Tiaong, Quezon', [
        ['Dolores Rivera', '0916 567 8906', 'dolores@riverawaterworks.test'],
    ]],
    'Valdez Paint Center' => ['23 Rizal St., Carmona, Cavite', [
        ['Sonia Valdez', '0917 678 9017', 'sonia@valdezpaint.test'],
    ]],
    'Soriano Power Solutions' => ['Lot 4, Carmelray Industrial Park, Canlubang, Laguna', [
        ['Engr. Leandro Soriano', '0918 789 0128', 'leandro@sorianopower.test'],
        ['Mia Dizon', '0919 890 1239', 'mia@sorianopower.test'],
        ['Carlo Evangelista', '0920 901 2340', null],
    ]],
    'Evangelista Housing Corp.' => ['Blk 7 Lot 2, Southville 5, San Pedro, Laguna', [
        ['Rosario Evangelista', '0921 012 3451', 'rosario@evangelistahousing.test'],
    ]],
    'Dizon Lumber & Hardware' => ['41 Aguinaldo Hwy, Imus, Cavite', [
        ['Teodoro Dizon', '0922 123 4562', 'teodoro@dizonlumber.test'],
    ]],
    'Tan Industrial Equipment' => ['Unit 3, Light Industry Park, Biñan, Laguna', [
        ['William Tan', '0923 234 5673', 'william@tanindustrial.test'],
        ['Grace Uy', '0915 345 6784', 'grace@tanindustrial.test'],
    ]],
    'Lim Facility Services' => ['7th Floor, Filinvest Corporate City, Alabang, Muntinlupa', [
        ['Stephanie Lim', '0916 456 7895', 'stephanie@limfacility.test'],
    ]],
];

$created = 0;

DB::transaction(function () use ($clients, &$created) {
    foreach ($clients as $name => [$address, $contacts]) {
        $client = Client::firstOrCreate(
            ['client_name' => $name],
            ['address' => $address],
        );

        if ($client->wasRecentlyCreated) {
            $created++;
        }

        foreach ($contacts as [$person, $number, $email]) {
            ClientContactPerson::firstOrCreate(
                ['client_id' => $client->id, 'contact_person' => $person],
                ['contact_number' => $number, 'email' => $email],
            );
        }
    }
});

echo "New clients: {$created}" . PHP_EOL
    . 'Totals - Clients: ' . Client::count()
    . ' | Contact people: ' . ClientContactPerson::count() . PHP_EOL;