<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('acquisition_leads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')->constrained('users')->cascadeOnDelete();
            $table->json('vehicle_specs'); // make, model, year, mileage, condition, etc.
            $table->json('photos_path')->nullable(); // array of uploaded photo paths
            $table->string('status')->default('submitted'); // submitted|under_appraisal|offer_made|accepted|declined
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('acquisition_leads');
    }
};
