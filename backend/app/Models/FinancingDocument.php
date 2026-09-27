<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinancingDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'application_id',
        'file_path',
        'doc_type',
        'verified',
    ];

    protected $casts = [
        'verified' => 'boolean',
    ];

    public function application(): BelongsTo
    {
        return $this->belongsTo(FinancingApplication::class, 'application_id');
    }
}
