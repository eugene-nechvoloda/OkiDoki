import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";

interface PRDFormProps {
  onSubmit: (data: PRDFormData) => void;
  isLoading: boolean;
}

export interface PRDFormData {
  projectName: string;
  description: string;
  targetUsers: string;
  goals: string;
  features: string;
}

export function PRDForm({ onSubmit, isLoading }: PRDFormProps) {
  const [formData, setFormData] = useState<PRDFormData>({
    projectName: "",
    description: "",
    targetUsers: "",
    goals: "",
    features: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field: keyof PRDFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isValid = formData.projectName && formData.description;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="projectName" className="text-sm font-medium">
          Product Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="projectName"
          placeholder="e.g., TaskFlow Pro"
          value={formData.projectName}
          onChange={(e) => handleChange("projectName", e.target.value)}
          className="h-12 bg-background"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">
          Product Description <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="description"
          placeholder="Describe what your product does and the problem it solves..."
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          className="min-h-[100px] bg-background resize-none"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="targetUsers" className="text-sm font-medium">
          Target Users
        </Label>
        <Input
          id="targetUsers"
          placeholder="e.g., Small business owners, freelancers"
          value={formData.targetUsers}
          onChange={(e) => handleChange("targetUsers", e.target.value)}
          className="h-12 bg-background"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="goals" className="text-sm font-medium">
          Key Goals
        </Label>
        <Textarea
          id="goals"
          placeholder="What are the main objectives? e.g., Increase productivity by 50%"
          value={formData.goals}
          onChange={(e) => handleChange("goals", e.target.value)}
          className="min-h-[80px] bg-background resize-none"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="features" className="text-sm font-medium">
          Key Features
        </Label>
        <Textarea
          id="features"
          placeholder="List the main features you envision..."
          value={formData.features}
          onChange={(e) => handleChange("features", e.target.value)}
          className="min-h-[80px] bg-background resize-none"
          disabled={isLoading}
        />
      </div>

      <Button
        type="submit"
        variant="hero"
        size="lg"
        className="w-full"
        disabled={!isValid || isLoading}
      >
        {isLoading ? (
          <>
            <Sparkles className="animate-pulse-soft" />
            Generating PRD...
          </>
        ) : (
          <>
            <Sparkles />
            Generate PRD
          </>
        )}
      </Button>
    </form>
  );
}
