<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('financing_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('vehicle_id')->constrained('vehicles')->cascadeOnDelete();
            $table->enum('employment_profile', ['employed', 'ofw', 'business_owner']);
            $table->unsignedTinyInteger('term_months'); // 12-60
            $table->decimal('down_payment', 12, 2);
            $table->decimal('monthly_amortization', 12, 2)->nullable();
            $table->string('status')->default('pending'); // pending|documents_review|approved|rejected
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('financing_applications');
    }
};
