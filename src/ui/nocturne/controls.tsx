import {m} from 'malevic';

function idFor(prefix: string, name: string) {
    return `${prefix}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

interface SwitchProps {
    name: string;
    label: Malevic.Child;
    hint?: string | null;
    checked: boolean;
    disabled?: boolean;
    size?: 'large' | 'normal';
    onChange: (checked: boolean) => void;
}

export function Switch(props: SwitchProps) {
    const hintId = props.hint ? idFor('switch-hint', props.name) : undefined;
    return (
        <label
            class={{
                'n-switch': true,
                'n-switch--large': props.size === 'large',
                'n-switch--disabled': Boolean(props.disabled),
            }}
        >
            <span class="n-switch__text">
                <span class="n-switch__label">{props.label}</span>
                {props.hint ? <span class="n-switch__hint" id={hintId}>{props.hint}</span> : null}
            </span>
            <input
                class="n-switch__input"
                type="checkbox"
                role="switch"
                disabled={props.disabled ? true : null}
                aria-describedby={hintId}
                onchange={(e: Event) => props.onChange((e.target as HTMLInputElement).checked)}
                onrender={(el: HTMLInputElement) => el.checked = props.checked}
            />
            <span class="n-switch__track" aria-hidden="true">
                <span class="n-switch__thumb" />
            </span>
        </label>
    );
}

interface RangeProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
}

const formatPercent = (value: number) => `${value}%`;

export function Range(props: RangeProps) {
    const id = idFor('range', props.label);
    function showValue(input: HTMLInputElement) {
        const output = input.parentElement!.querySelector('output')!;
        const text = formatPercent(Number(input.value));
        output.textContent = text;
        input.setAttribute('aria-valuetext', text);
    }

    return (
        <div class="n-range">
            <label class="n-range__label" for={id}>{props.label}</label>
            <output class="n-range__value" for={id}>{formatPercent(props.value)}</output>
            <input
                class="n-range__input"
                id={id}
                type="range"
                min={props.min}
                max={props.max}
                step={props.step}
                aria-valuetext={formatPercent(props.value)}
                onpointerdown={(e: Event) => (e.target as HTMLElement).dataset.dragging = 'true'}
                onpointerup={(e: Event) => delete (e.target as HTMLElement).dataset.dragging}
                oninput={(e: Event) => showValue(e.target as HTMLInputElement)}
                onchange={(e: Event) => props.onChange(Number((e.target as HTMLInputElement).value))}
                onrender={(el: HTMLInputElement) => {
                    // Re-rendering mid-drag would snap the thumb back to the stored value.
                    if (!el.dataset.dragging) {
                        el.value = String(props.value);
                    }
                }}
            />
        </div>
    );
}

interface ChoiceProps<T> {
    legend: string;
    name: string;
    value: T;
    options: Array<{value: T; label: string}>;
    onChange: (value: T) => void;
}

export function Choice<T>(props: ChoiceProps<T>) {
    return (
        <fieldset class="n-choice">
            <legend class="n-choice__legend">{props.legend}</legend>
            <div class="n-choice__options">
                {props.options.map((option) => (
                    <label class="n-choice__option">
                        <input
                            class="n-choice__input"
                            type="radio"
                            name={props.name}
                            onchange={() => props.onChange(option.value)}
                            onrender={(el: HTMLInputElement) => el.checked = option.value === props.value}
                        />
                        <span class="n-choice__text">{option.label}</span>
                    </label>
                ))}
            </div>
        </fieldset>
    );
}
