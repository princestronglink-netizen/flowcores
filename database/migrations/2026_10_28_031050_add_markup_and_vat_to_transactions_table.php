<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->decimal('markup_percent', 5, 2)->default(0)->after('amount');
            $table->decimal('vat_percent', 5, 2)->default(12)->after('markup_percent');
        });

        // Existing transactions were priced without VAT: keep their totals unchanged.
        DB::table('transactions')->update(['vat_percent' => 0]);
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn(['markup_percent', 'vat_percent']);
        });
    }
};