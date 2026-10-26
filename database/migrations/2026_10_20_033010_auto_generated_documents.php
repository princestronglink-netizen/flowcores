<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_orders', function (Blueprint $t) {
            $t->foreignId('transaction_id')->nullable()->after('po_number')
                ->constrained('transactions')->nullOnDelete();
            $t->string('supplier', 120)->nullable()->change(); // filled in later, when the draft is edited
            $t->date('order_date')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('purchase_orders', fn (Blueprint $t) => $t->dropConstrainedForeignId('transaction_id'));
    }
};