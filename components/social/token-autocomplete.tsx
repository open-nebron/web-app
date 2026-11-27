'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { socialApi } from '@/lib/social-api';
import { useSuggestions } from '@/hooks/useFeed';
import { useTrendingHashtags } from '@/hooks/usePosts';
import { cn, normalizeStorageUrl } from '@/lib/utils';
import {
  applyTokenSelection,
  detectActiveToken,
  type ActiveToken,
} from '@/lib/social-tokens';
import { Hash, Loader2 } from 'lucide-react';

export { applyTokenSelection, detectActiveToken, type ActiveToken };

export interface TokenAutocompleteOption {
  id: string;
  label: string;
  sublabel?: string;
  value: string;
  avatarUrl?: string | null;
}

export function useTokenAutocomplete(value: string, cursorPos: number | null) {
  const activeToken = React.useMemo(() => {
    if (cursorPos === null) return null;
    return detectActiveToken(value, cursorPos);
  }, [value, cursorPos]);

  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  React.useEffect(() => {
    const q = activeToken?.query ?? '';
    const timer = setTimeout(() => setDebouncedQuery(q), 160);
    return () => clearTimeout(timer);
  }, [activeToken?.query]);

  const isMention = activeToken?.trigger === '@';
  const isHashtag = activeToken?.trigger === '#';

  const { data: searchedUsers, isFetching: searchingUsers } = useQuery({
    queryKey: ['token-autocomplete-users', debouncedQuery],
    queryFn: () => socialApi.searchUsers(debouncedQuery, 6),
    enabled: Boolean(isMention && debouncedQuery.length >= 1),
    staleTime: 15 * 1000,
  });

  const { data: suggestedUsers } = useSuggestions(6);
  const { data: trendingTags, isLoading: loadingTags } = useTrendingHashtags(10, Boolean(isHashtag));

  const options = React.useMemo<TokenAutocompleteOption[]>(() => {
    if (!activeToken) return [];
    if (activeToken.trigger === '@') {
      const source =
        activeToken.query.trim().length >= 1
          ? searchedUsers ?? []
          : suggestedUsers ?? [];
      return source.slice(0, 6).map((u) => ({
        id: u.userId,
        label: u.name || u.username,
        sublabel: `@${u.username}`,
        value: u.username,
        avatarUrl: u.avatarUrl,
      }));
    }

    const qLower = activeToken.query.toLowerCase();
    const matched = (trendingTags ?? [])
      .filter((t) => (!qLower ? true : t.tag.toLowerCase().includes(qLower)))
      .slice(0, 8);

    return matched.map((t) => ({
      id: t.tag,
      label: `#${t.tag}`,
      sublabel: `${t.postCount} ${t.postCount === 1 ? 'post' : 'posts'}`,
      value: t.tag,
    }));
  }, [activeToken, searchedUsers, suggestedUsers, trendingTags]);

  return {
    activeToken,
    options,
    isLoading: (isMention && searchingUsers && debouncedQuery.length >= 1) || (isHashtag && loadingTags),
  };
}

export function useTokenComposerInput(params: {
  value: string;
  setValue: (val: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  onSubmit?: () => void;
  onEscape?: () => void;
  submitOnEnter?: boolean;
}) {
  const { value, setValue, inputRef, onSubmit, onEscape, submitOnEnter = false } = params;
  const [cursorPos, setCursorPos] = React.useState<number | null>(null);
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);
  const { activeToken, options, isLoading } = useTokenAutocomplete(value, cursorPos);

  React.useEffect(() => {
    setHighlightedIndex(0);
  }, [activeToken?.trigger, activeToken?.query]);

  const clearAutocomplete = React.useCallback(() => {
    setCursorPos(null);
  }, []);

  const handleSelectOption = React.useCallback(
    (opt: TokenAutocompleteOption) => {
      if (!activeToken) return;
      const { nextValue, nextCursor } = applyTokenSelection(value, activeToken, opt.value);
      setValue(nextValue);
      setCursorPos(nextCursor);
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(nextCursor, nextCursor);
        }
      });
    },
    [activeToken, inputRef, setValue, value]
  );

  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      setValue(e.target.value);
      setCursorPos(e.target.selectionStart ?? e.target.value.length);
    },
    [setValue]
  );

  const handleCursorEvent = React.useCallback(
    (e: React.SyntheticEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      const target = e.currentTarget;
      setCursorPos(target.selectionStart ?? target.value.length);
    },
    []
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      if (activeToken && options.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setHighlightedIndex((prev) => (prev + 1) % options.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setHighlightedIndex((prev) => (prev - 1 + options.length) % options.length);
          return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          const chosen = options[highlightedIndex] ?? options[0];
          if (chosen) handleSelectOption(chosen);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          setCursorPos(null);
          return;
        }
      }

      if (e.key === 'Escape') {
        if (activeToken) {
          e.preventDefault();
          e.stopPropagation();
          setCursorPos(null);
          return;
        }
        if (onEscape) {
          e.preventDefault();
          onEscape();
          return;
        }
      }

      if (e.key === 'Enter' && (submitOnEnter ? !e.shiftKey : e.metaKey || e.ctrlKey)) {
        if (onSubmit) {
          e.preventDefault();
          onSubmit();
        }
      }
    },
    [activeToken, options, highlightedIndex, handleSelectOption, onEscape, onSubmit, submitOnEnter]
  );

  return {
    activeToken,
    options,
    isLoading,
    highlightedIndex,
    clearAutocomplete,
    handleSelectOption,
    handleInputChange,
    handleCursorEvent,
    handleKeyDown,
  };
}

export interface TokenAutocompleteDropdownProps {
  activeToken: ActiveToken | null;
  options: TokenAutocompleteOption[];
  isLoading: boolean;
  highlightedIndex: number;
  position?: 'above' | 'below';
  onSelect: (option: TokenAutocompleteOption) => void;
}

export function TokenAutocompleteDropdown({
  activeToken,
  options,
  isLoading,
  highlightedIndex,
  position = 'below',
  onSelect,
}: TokenAutocompleteDropdownProps) {
  if (!activeToken) return null;
  if (!isLoading && options.length === 0) return null;

  return (
    <div
      role="listbox"
      data-testid="token-autocomplete-dropdown"
      className={cn(
        'absolute left-0 right-0 z-50 rounded-lg border bg-popover text-popover-foreground shadow-lg overflow-hidden max-h-52 overflow-y-auto',
        position === 'above' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
      )}
    >
      {isLoading && options.length === 0 ? (
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Searching...</span>
        </div>
      ) : (
        options.map((opt, idx) => {
          const active = idx === highlightedIndex;
          return (
            <button
              key={opt.id}
              type="button"
              role="option"
              aria-selected={active}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect(opt);
              }}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors',
                active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'
              )}
            >
              {activeToken.trigger === '@' ? (
                <Avatar className="w-6 h-6 shrink-0">
                  <AvatarImage
                    src={opt.avatarUrl ? normalizeStorageUrl(opt.avatarUrl) : undefined}
                    alt={opt.value}
                  />
                  <AvatarFallback className="text-[10px]">
                    {opt.label.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Hash className="w-3.5 h-3.5" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{opt.label}</div>
                {opt.sublabel && (
                  <div className="text-[11px] text-muted-foreground truncate">
                    {opt.sublabel}
                  </div>
                )}
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}
