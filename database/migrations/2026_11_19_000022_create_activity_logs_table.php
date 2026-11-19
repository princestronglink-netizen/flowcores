<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->string('user_name')->nullable();        // snapshot: survives user deletion
            $t->string('event', 60)->index();           // e.g. client.created, delivery.recorded
            $t->string('description');
            $t->nullableMorphs('subject');              // subject_type, subject_id (+ index)
            $t->string('subject_label')->nullable();    // snapshot: survives record deletion
            $t->json('properties')->nullable();         // {old:{}, new:{}} or custom data
            $t->string('ip_address', 45)->nullable();
            $t->timestamp('created_at')->useCurrent()->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};