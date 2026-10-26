<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * On a return row (negative quantity), written_off_quantity says how many of those
     * units did NOT go back into stock (damaged, defective, ...). The rest were restocked.
     */
    public function up(): void
    {
        Schema::table('delivery_items', function (Blueprint $table) {
            $table->unsignedInteger('written_off_quantity')->default(0)->after('quantity');
            $table->string('reason', 100)->nullable()->after('written_off_quantity');
        });
    }

    public function down(): void
    {
        Schema::table('delivery_items', function (Blueprint $table) {
            $table->dropColumn(['written_off_quantity', 'reason']);
        });
    }
};
