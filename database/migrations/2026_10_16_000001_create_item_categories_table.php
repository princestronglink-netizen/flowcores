<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('item_categories', function (Blueprint $table) {
            $table->id();
            $table->string('category_name')->unique();
            $table->string('description', 500)->nullable();
            $table->timestamps();
        });

        // Deleting a category never deletes items: they just become "Uncategorized".
        Schema::table('items', function (Blueprint $table) {
            $table->foreignId('item_category_id')
                ->nullable()
                ->after('id')
                ->constrained('item_categories')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('item_category_id');
        });

        Schema::dropIfExists('item_categories');
    }
};
