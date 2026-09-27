<?php

namespace App\Support;

/**
 * Spells out a peso amount for legal documents (Deed of Sale consideration
 * clause) — e.g. 765230.00 -> "SEVEN HUNDRED SIXTY-FIVE THOUSAND TWO
 * HUNDRED THIRTY PESOS ONLY". No intl extension in this environment
 * (NumberFormatter::SPELLOUT unavailable), so this is a small dedicated
 * converter rather than pulling in a package for one string.
 */
class NumberToWords
{
    private const ONES = [
        '', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
        'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN',
        'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN',
    ];

    private const TENS = [
        '', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY',
    ];

    private const SCALES = ['', ' THOUSAND', ' MILLION', ' BILLION'];

    public static function pesos(float $amount): string
    {
        $whole = (int) floor($amount);
        $centavos = (int) round(($amount - $whole) * 100);

        $words = $whole === 0 ? 'ZERO' : self::convert($whole);
        $words .= ' PESOS';

        if ($centavos > 0) {
            $words .= ' AND '.self::convert($centavos).' CENTAVOS';
        }

        return $words.' ONLY';
    }

    private static function convert(int $number): string
    {
        if ($number === 0) {
            return '';
        }

        $parts = [];
        $scaleIndex = 0;

        while ($number > 0) {
            $chunk = $number % 1000;

            if ($chunk > 0) {
                $chunkWords = self::convertHundreds($chunk).self::SCALES[$scaleIndex];
                array_unshift($parts, $chunkWords);
            }

            $number = (int) floor($number / 1000);
            $scaleIndex++;
        }

        return trim(implode(' ', $parts));
    }

    private static function convertHundreds(int $chunk): string
    {
        $words = '';

        if ($chunk >= 100) {
            $words .= self::ONES[intdiv($chunk, 100)].' HUNDRED ';
            $chunk %= 100;
        }

        if ($chunk >= 20) {
            $words .= self::TENS[intdiv($chunk, 10)];
            $remainder = $chunk % 10;
            $words .= $remainder > 0 ? '-'.self::ONES[$remainder] : '';
        } elseif ($chunk > 0) {
            $words .= self::ONES[$chunk];
        }

        return trim($words);
    }
}
