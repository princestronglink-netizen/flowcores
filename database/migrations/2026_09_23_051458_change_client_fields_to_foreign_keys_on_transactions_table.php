<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn(['client_name', 'contact_person']);
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignId('client_id')
                ->after('name')
                ->constrained('clients')
                ->cascadeOnDelete();

            $table->foreignId('client_contact_person_id')
                ->after('client_id')
                ->constrained('client_contact_people')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropForeign(['client_id']);
            $table->dropForeign(['client_contact_person_id']);
            $table->dropColumn(['client_id', 'client_contact_person_id']);
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->string('client_name')->after('name');
            $table->string('contact_person')->after('client_id');
        });
    }
};