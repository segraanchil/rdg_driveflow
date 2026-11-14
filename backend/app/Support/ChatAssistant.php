<?php

namespace App\Support;

use App\Models\FinancingApplication;
use App\Models\Setting;
use App\Models\Vehicle;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * The 24/7 assistant behind the chat widget (Story 11). It reads the visitor's question,
 * recognises what it is about (English and common Filipino/Taglish phrasing) and answers
 * from the live inventory and business settings, with links to the right page.
 *
 * This is a rule-based assistant: it needs no AI provider or API key. A language-model
 * provider can replace reply() later without changing the widget or the API.
 *
 * It also flags high buying intent (Story 17) so staff can be alerted to take over.
 */
class ChatAssistant
{
    public const DOC_LABELS = [
        'payslip' => 'latest payslips', 'coe' => 'certificate of employment', 'valid_id' => 'valid ID',
        'proof_of_billing' => 'proof of billing', 'consularized_authorization' => 'consularized authorization',
        'dti_or_sec' => 'DTI/SEC registration', 'itr' => 'income tax return (ITR)', 'bank_statement' => 'bank statements',
    ];

    private const HIGH_INTENT = [
        'reserve', 'reservation', 'buy', 'purchase', 'ready', 'down payment', 'downpayment', 'dp',
        'how to pay', 'pay', 'cash', 'test drive', 'testdrive', 'visit', 'view the car', 'still available',
        'available pa', 'kukunin', 'bibilhin', 'bilhin', 'kunin ko', 'gusto ko', 'magpa-reserve', 'pareserve',
    ];

    /** @return array{text: string, links: array<int, array{label: string, to: string}>, high_intent: bool} */
    public function reply(string $message): array
    {
        $text = Str::lower(trim($message));
        $settings = Setting::allValues();
        $highIntent = $this->has($text, self::HIGH_INTENT);

        $answer = match (true) {
            $this->has($text, ['human', 'agent', 'person', 'staff', 'tao', 'kausap']) => $this->say(
                'Sure. Tap "Talk to a human agent" below and our staff will be alerted to join this chat.'),
            $this->has($text, ['sell my', 'sell a car', 'trade in', 'trade-in', 'ibenta', 'benta ko', 'appraise', 'appraisal']) => $this->say(
                'We buy cars too! Submit your car’s details and photos in our Sell Your Car portal and our team will send you an offer.',
                [['label' => 'Sell your car', 'to' => '/sell-your-car']]),
            $this->has($text, ['warranty', 'money back', 'money-back', 'refund', 'defect', 'sira', 'problem with my car']) => $this->say(
                'Every car comes with a 1-month money-back guarantee. If something is wrong, file a warranty claim with photos within a month of purchase and you’ll get a ticket number to track it.',
                [['label' => 'File a warranty claim', 'to' => '/warranty-claim']]),
            $this->has($text, ['requirement', 'document', 'papers', 'kailangan', 'payslip', 'coe', 'itr']) => $this->requirements(),
            $this->has($text, ['gcash', 'maya', 'bank transfer', 'bayad', 'magbayad', 'how to pay', 'how do i pay', 'payment method', 'mode of payment']) => $this->payment($settings),
            $this->has($text, ['finance', 'financing', 'loan', 'installment', 'hulugan', 'hulog', 'monthly', 'amortization', 'bank']) => $this->financing($settings, $text),
            $this->has($text, ['reserve', 'reservation', 'hold', 'reservation fee', 'pareserve', 'magpa-reserve']) => $this->say(
                'To reserve, open the car’s page and choose "Reserve — Straight Cash". Pay the reservation fee of ₱'.number_format($settings['reservation_fee']).' and upload your receipt. The car is held for you right away while we verify the payment within 48 hours.',
                [['label' => 'Browse cars', 'to' => '/inventory']]),
            $this->has($text, ['test drive', 'testdrive', 'try the car', 'drive it']) => $this->say(
                'You can book a test drive from any car’s page: tap "Test Drive" and pick a date and time. Our staff confirms it by email. Note that a test drive doesn’t reserve the car.',
                [['label' => 'Browse cars', 'to' => '/inventory']]),
            $this->has($text, ['where', 'location', 'address', 'saan', 'located', 'branch', 'hours', 'open', 'bukas', 'contact', 'phone', 'number']) => $this->contact($settings),
            default => $this->vehicleAnswer($text) ?? $this->fallback($text),
        };

        return [...$answer, 'high_intent' => $highIntent];
    }

    private function vehicleAnswer(string $text): ?array
    {
        $budget = $this->budget($text);
        $matches = $this->matchingVehicles($text);
        $asksPrice = $this->has($text, ['price', 'how much', 'magkano', 'presyo', 'cost', 'hm']);
        $asksStock = $this->has($text, ['available', 'stock', 'inventory', 'cars', 'what do you have', 'meron', 'units', 'show me', 'list']);

        if ($matches->isNotEmpty()) {
            $lines = $matches->take(4)->map(fn (Vehicle $v) => "• {$v->year} {$v->make} {$v->model}: ₱".number_format((float) $v->selling_price).($v->mileage ? ', '.number_format($v->mileage).' km' : ''))->implode("\n");
            $intro = $matches->count() === 1 ? 'Here’s what we have:' : "We have {$matches->count()} matching car".($matches->count() === 1 ? '' : 's').' available:';

            return $this->say("{$intro}\n{$lines}\nOpen a car to see it in 360°, estimate a loan, or reserve it.",
                $matches->take(3)->map(fn (Vehicle $v) => ['label' => "{$v->year} {$v->make} {$v->model}", 'to' => "/inventory/{$v->id}"])->values()->all());
        }

        if ($budget) {
            $cars = Vehicle::where('status', Vehicle::STATUS_AVAILABLE)->where('selling_price', '<=', $budget)->orderByDesc('selling_price')->take(4)->get();
            if ($cars->isEmpty()) {
                $cheapest = Vehicle::where('status', Vehicle::STATUS_AVAILABLE)->min('selling_price');

                return $this->say('We don’t have a car within ₱'.number_format($budget).' right now.'.($cheapest ? ' Our most affordable car is ₱'.number_format((float) $cheapest).'. Financing can lower what you pay up front.' : ''),
                    [['label' => 'Loan calculator', 'to' => '/loan-calculator']]);
            }
            $lines = $cars->map(fn (Vehicle $v) => "• {$v->year} {$v->make} {$v->model}: ₱".number_format((float) $v->selling_price))->implode("\n");

            return $this->say('Within ₱'.number_format($budget).", we have:\n{$lines}",
                [['label' => 'See all within budget', 'to' => '/inventory?max_price='.(int) $budget]]);
        }

        if ($asksStock || $asksPrice) {
            $available = Vehicle::where('status', Vehicle::STATUS_AVAILABLE);
            $count = (clone $available)->count();
            if ($count === 0) {
                return $this->say('All our cars are spoken for at the moment. New arrivals are being prepared. Check back soon!');
            }
            $makes = (clone $available)->distinct()->orderBy('make')->pluck('make')->take(6)->implode(', ');
            $min = (float) (clone $available)->min('selling_price');
            $max = (float) (clone $available)->max('selling_price');

            return $this->say("We have {$count} car".($count === 1 ? '' : 's')." available ({$makes}), priced from ₱".number_format($min).' to ₱'.number_format($max).'. Tell me a brand, model or budget (e.g. "Vios" or "under 600k") and I’ll find matches.',
                [['label' => 'Browse inventory', 'to' => '/inventory']]);
        }

        return null;
    }

    /** Available cars whose make or model is mentioned in the message. */
    private function matchingVehicles(string $text): Collection
    {
        $words = collect(preg_split('/[^a-z0-9\-]+/', $text))->filter(fn ($w) => strlen($w) >= 3)->values();
        if ($words->isEmpty()) {
            return collect();
        }

        return Vehicle::where('status', Vehicle::STATUS_AVAILABLE)->get()
            ->filter(function (Vehicle $v) use ($words) {
                $make = Str::lower($v->make);
                $model = Str::lower($v->model);

                return $words->contains(fn ($w) => $w === $make || str_contains($model, $w) || ($w === Str::lower(Str::before($model, ' '))));
            })
            ->sortBy('selling_price')
            ->values();
    }

    /** "under 600k", "500,000", "1.2m", "budget 450 thousand" → pesos. */
    private function budget(string $text): ?float
    {
        if (! preg_match('/(\d+(?:[.,]\d+)*)\s*(k|m|thousand|million|mil|libo)?\b/', $text, $m)) {
            return null;
        }
        $number = (float) str_replace(',', '', $m[1]);
        $unit = $m[2] ?? '';
        $value = match ($unit) {
            'k', 'thousand', 'libo' => $number * 1_000,
            'm', 'million', 'mil' => $number * 1_000_000,
            default => $number,
        };

        // Ignore years ("2019") and small numbers that aren't prices.
        return $value >= 50_000 && ! ($unit === '' && $value >= 1980 && $value <= 2100) ? $value : null;
    }

    private function financing(array $settings, string $text): array
    {
        $rates = collect(['employed' => 'Employed', 'ofw' => 'OFW', 'business_owner' => 'Business owner'])
            ->map(fn ($label, $key) => "{$label}: ".rtrim(rtrim(number_format($settings["loan_rate_{$key}"], 2), '0'), '.').'% a year')
            ->implode(' · ');

        return $this->say("Yes, we offer bank financing with terms from 12 to 60 months. Estimated interest ({$rates}). Use the loan calculator to see your monthly payment, then apply online from the car’s page and upload your documents there.",
            [['label' => 'Loan calculator', 'to' => '/loan-calculator'], ['label' => 'Browse cars', 'to' => '/inventory']]);
    }

    private function requirements(): array
    {
        $labels = ['employed' => 'Employed', 'ofw' => 'OFW', 'business_owner' => 'Business owner'];
        $lines = collect(FinancingApplication::CHECKLISTS)
            ->map(fn ($docs, $key) => "• {$labels[$key]}: ".collect($docs)->map(fn ($d) => self::DOC_LABELS[$d] ?? str_replace('_', ' ', $d))->implode(', '))
            ->implode("\n");

        return $this->say("Financing requirements depend on your work:\n{$lines}\nFor a cash purchase, just bring a valid ID.",
            [['label' => 'Loan calculator', 'to' => '/loan-calculator']]);
    }

    private function contact(array $s): array
    {
        $parts = array_filter([
            $s['business_address'] ? "📍 {$s['business_address']}" : null,
            $s['business_hours'] ? "🕘 {$s['business_hours']}" : null,
            $s['business_phone'] ? "📞 {$s['business_phone']}" : null,
            $s['business_email'] ? "✉️ {$s['business_email']}" : null,
        ]);

        return $this->say("You can visit us here:\n".implode("\n", $parts));
    }

    private function payment(array $s): array
    {
        $channels = array_filter([
            $s['payment_bank_name'] && $s['payment_account_number'] ? "• {$s['payment_bank_name']}: {$s['payment_account_number']} ({$s['payment_account_name']})" : null,
            $s['payment_ewallet_number'] ? "• {$s['payment_ewallet_name']}: {$s['payment_ewallet_number']}" : null,
        ]);

        return $this->say('You can pay the reservation fee (₱'.number_format($s['reservation_fee']).') by bank transfer, e-wallet or at our showroom'
            .($channels ? ":\n".implode("\n", $channels) : '.')
            ."\nAfter paying, upload your receipt on the car’s reservation page. The balance is paid when you claim the car.",
            [['label' => 'Browse cars', 'to' => '/inventory']]);
    }

    private function fallback(string $text): array
    {
        if ($this->has($text, ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'kumusta', 'musta'])) {
            return $this->say('Hi! I’m the RDG assistant. Ask me about available cars, prices, financing, reservations or test drives.');
        }
        if ($this->has($text, ['thank', 'salamat', 'ty'])) {
            return $this->say('You’re welcome! Anything else I can help with?');
        }

        return $this->say('I’m not sure I got that. You can ask things like "Do you have a Vios?", "cars under 600k", "financing requirements" or "how to reserve". Or tap "Talk to a human agent" below.');
    }

    private function has(string $text, array $needles): bool
    {
        foreach ($needles as $needle) {
            if (preg_match('/(^|[^a-z])'.preg_quote($needle, '/').'s?([^a-z]|$)/u', $text)) {
                return true;
            }
        }

        return false;
    }

    private function say(string $text, array $links = []): array
    {
        return ['text' => $text, 'links' => $links];
    }
}
