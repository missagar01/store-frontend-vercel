import { useState } from 'react';

import {
    Command,
    CommandInput,
    CommandItem,
    CommandList,
    CommandGroup,
    CommandEmpty,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';


type ComboboxProps = {
  multiple?: boolean;
  options: { label: string; value: string }[];
  value: string[];
  onChange: (val: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function ComboBox({
  multiple,
  options,
  value,
  onChange,
  placeholder = "Select option(s)",
  disabled = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const handleSelect = (val: string) => {
    if (disabled) return;

    if (multiple) {
      if (value.includes(val)) {
        onChange(value.filter((v) => v !== val));
      } else {
        onChange([...value, val]);
      }
    } else {
      onChange([val]);
      setOpen(false);
    }
  };

  const displayLabel = () => {
    if (value.length === 0) return placeholder;
    if (multiple) return `${value.length} selected`;
    return options.find((opt) => opt.value === value[0])?.label ?? placeholder;
  };

  const filteredOptions = options.filter((opt) => {
    if (!search.trim()) return true;
    const needle = search.toLowerCase();
    return (
      opt.label.toLowerCase().includes(needle) ||
      opt.value.toLowerCase().includes(needle)
    );
  });

  return (
    <Popover open={open && !disabled} onOpenChange={(val) => !disabled && setOpen(val)}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          <span className="text-muted-foreground">{displayLabel()}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-[240px] max-w-full p-0"
      >
        <Command>
          <CommandInput
            placeholder="Search..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={`${opt.label} ${opt.value}`}
                  onSelect={() => handleSelect(opt.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value.includes(opt.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
