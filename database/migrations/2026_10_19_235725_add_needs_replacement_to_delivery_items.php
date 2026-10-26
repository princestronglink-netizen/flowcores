<?php
// php artisan make:migration add_needs_replacement_to_delivery_items

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('delivery_items', function (Blueprint $t) {
            // null for deliveries; true/false for return rows
            $t->boolean('needs_replacement')->nullable()->after('reason');
        });
    }

    public function down(): void
    {
        Schema::table('delivery_items', fn (Blueprint $t) => $t->dropColumn('needs_replacement'));
    }
};