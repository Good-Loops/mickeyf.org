import React, { useEffect, useRef, useState } from 'react';

type DropdownOption = { value: string; label: string };

interface DropdownProps {
    options: DropdownOption[];
    value: string | null;
    onChange: (value: string) => void;
    disabled?: boolean;
    placeholder?: string;
    className?: string;
    buttonClassName?: string;
    selectedClassName?: string;
    caretClassName?: string;
    menuClassName?: string;
    optionClassName?: string;
    /**
     * Optional custom renderer for the selected label.
     * If provided, it receives the selected option (or null) and the
     * fallback label string (selected label or placeholder).
     */
    renderSelected?: (selected: DropdownOption | null, label: string) => React.ReactNode;
}

/**
 * Generic React dropdown component.
 *
 * Styling:
 * - Provides base CSS hooks: `dropdown`, `dropdown__button`, `dropdown__selected`,
 *   `dropdown__caret`, `dropdown__menu`, `dropdown__option`, and `dropdown--open`.
 * - Callers can pass additional class names via props to adapt it to any page.
 */
const Dropdown: React.FC<DropdownProps> = ({
    options,
    value,
    onChange,
    disabled = false,
    placeholder = 'Select…',
    className = '',
    buttonClassName = '',
    selectedClassName = '',
    caretClassName = '',
    menuClassName = '',
    optionClassName = '',
    renderSelected,
}) => {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleDocClick = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener('click', handleDocClick);
        return () => document.removeEventListener('click', handleDocClick);
    }, []);

    const handleToggle = () => {
        if (disabled) return;
        setOpen((prev) => !prev);
    };

    const handleSelect = (val: string) => {
        if (disabled) return;
        onChange(val);
        setOpen(false);
    };

    const selectedOption = options.find((o) => o.value === value) ?? null;
    const label = selectedOption ? selectedOption.label : placeholder;

    return (
        <div
            className={`dropdown ${open ? 'dropdown--open active' : ''} ${className}`.trim()}
            ref={wrapperRef}
        >
            <button
                type="button"
                className={`dropdown__button ${buttonClassName}`.trim()}
                disabled={disabled}
                aria-haspopup="true"
                aria-expanded={open}
                onClick={handleToggle}
            >
                <span className={`dropdown__selected ${selectedClassName}`.trim()}>
                    {renderSelected ? renderSelected(selectedOption, label) : label}
                </span>
                <span className={`dropdown__caret ${caretClassName}`.trim()}>▾</span>
            </button>

            <ul
                className={`dropdown__menu ${menuClassName}`.trim()}
                role="menu"
            >
                {options.map((opt) => (
                    <li key={opt.value}>
                        <button
                            type="button"
                            className={`dropdown__option ${optionClassName}`.trim()}
                            onClick={() => handleSelect(opt.value)}
                        >
                            {opt.label}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Dropdown;
