<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->boolean('is_return')->default(false)->after('note');
        });

        // Returns are stored as negative quantities, so the column can't be unsigned.
        // (On Laravel 10 or older, ->change() needs doctrine/dbal.)
        Schema::table('delivery_items', function (Blueprint $table) {
            $table->integer('quantity')->change();
        });
    }

    public function down(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->dropColumn('is_return');
        });

        // Delete return rows (negative quantities) before rolling this back.
        Schema::table('delivery_items', function (Blueprint $table) {
            $table->unsignedInteger('quantity')->change();
        });
    }
};