'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface RoleOption {
  id: string;
  name: string;
  category: string;
}

interface RegionOption {
  id: string;
  name: string;
}

interface RoleInputFormProps {
  roles: RoleOption[];
  regions: RegionOption[];
  onSubmit: (roleId: string, regionId: string | null, salary: number | null) => void;
}

export function RoleInputForm({ roles, regions, onSubmit }: RoleInputFormProps) {
  const [roleQuery, setRoleQuery] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [regionId, setRegionId] = useState<string>('all');
  const [salary, setSalary] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filteredRoles = useMemo(() => {
    if (!roleQuery.trim()) return [];
    const query = roleQuery.toLowerCase();
    return roles
      .filter((r) => r.name.toLowerCase().includes(query))
      .slice(0, 10);
  }, [roleQuery, roles]);

  const handleSelectRole = useCallback((role: RoleOption) => {
    setSelectedRoleId(role.id);
    setRoleQuery(role.name);
    setShowSuggestions(false);
  }, []);

  const handleRoleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setRoleQuery(e.target.value);
      setSelectedRoleId('');
      setShowSuggestions(true);
    },
    []
  );

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedRoleId) return;
      const parsedSalary = salary ? parseFloat(salary) : null;
      onSubmit(
        selectedRoleId,
        regionId === 'all' ? null : regionId,
        parsedSalary && !isNaN(parsedSalary) ? parsedSalary : null
      );
    },
    [selectedRoleId, regionId, salary, onSubmit]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Job Title */}
      <div className="space-y-1.5">
        <label
          htmlFor="role-input"
          className="text-sm font-medium text-foreground"
        >
          Job Title
        </label>
        <div className="relative" ref={wrapperRef}>
          <Input
            id="role-input"
            type="text"
            placeholder="Start typing a job title..."
            value={roleQuery}
            onChange={handleRoleInputChange}
            onFocus={() => roleQuery.trim() && setShowSuggestions(true)}
            autoComplete="off"
          />
          {showSuggestions && filteredRoles.length > 0 && (
            <ul className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md border bg-popover shadow-lg">
              {filteredRoles.map((role) => (
                <li key={role.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground outline-none"
                    onClick={() => handleSelectRole(role)}
                  >
                    <span className="font-medium">{role.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {role.category}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {showSuggestions && roleQuery.trim() && filteredRoles.length === 0 && (
            <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-3 shadow-lg">
              <p className="text-sm text-muted-foreground">
                No matching roles found
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Region */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Region</label>
        <Select value={regionId} onValueChange={setRegionId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ontario</SelectItem>
            {regions.map((region) => (
              <SelectItem key={region.id} value={region.id}>
                {region.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Salary */}
      <div className="space-y-1.5">
        <label
          htmlFor="salary-input"
          className="text-sm font-medium text-foreground"
        >
          My Salary{' '}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <Input
          id="salary-input"
          type="number"
          placeholder="e.g. 120000"
          value={salary}
          onChange={(e) => setSalary(e.target.value)}
          min={0}
          step={1000}
        />
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={!selectedRoleId}
        className="w-full bg-amber-600 hover:bg-amber-700 text-white"
      >
        Show My Benchmark
      </Button>
    </form>
  );
}
