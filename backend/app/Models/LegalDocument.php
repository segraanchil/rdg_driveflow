<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LegalDocument extends Model
{
    use HasFactory;

    public const TYPE_INVOICE = 'invoice';

    public const TYPE_DEED_OF_SALE = 'deed_of_sale';

    public const TYPE_OFFICIAL_RECEIPT = 'official_receipt';

    protected $fillable = [
        'sale_id',
        'doc_type',
        'file_path',
        'generated_at',
    ];

    protected $casts = [
        'generated_at' => 'datetime',
    ];

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }
}
