"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit2, Trash2, X, Save, Loader2, Check } from "lucide-react";

type Feature = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
};

type Plan = {
  id: string;
  name: string;
  slug: string;
  tier_level: number;
};

type FeaturesManagerProps = {
  initialFeatures: Feature[];
  plans: Plan[];
  featureMap: Map<string, Set<string>>;
};

const categoryOptions = [
  { value: "core", label: "Core Features" },
  { value: "payments", label: "Payment Processing" },
  { value: "marketing", label: "Marketing & Sales" },
  { value: "integrations", label: "Integrations" },
  { value: "team", label: "Team Management" },
  { value: "analytics", label: "Analytics & Reporting" },
  { value: "enterprise", label: "Enterprise Features" },
  { value: "support", label: "Support & Services" },
];

export default function FeaturesManager({
  initialFeatures,
  plans,
  featureMap,
}: FeaturesManagerProps) {
  const router = useRouter();
  const [features, setFeatures] = useState(initialFeatures);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    category: "core",
  });

  const handleEdit = (feature: Feature) => {
    setEditingId(feature.id);
    setFormData({
      name: feature.name,
      slug: feature.slug,
      description: feature.description || "",
      category: feature.category,
    });
    setIsAdding(false);
  };

  const handleAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormData({
      name: "",
      slug: "",
      description: "",
      category: "core",
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ name: "", slug: "", description: "", category: "core" });
    setError(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (isAdding) {
        // Create new feature
        const response = await fetch("/api/admin/features", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to create feature");
        }

        setFeatures([...features, data.feature]);
        setSuccess("Feature created successfully!");
      } else if (editingId) {
        // Update existing feature
        const response = await fetch(`/api/admin/features/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to update feature");
        }

        setFeatures(
          features.map((f) => (f.id === editingId ? data.feature : f))
        );
        setSuccess("Feature updated successfully!");
      }

      handleCancel();
      setTimeout(() => {
        router.refresh();
        setSuccess(null);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (featureId: string, featureName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete the feature "${featureName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsDeleting(featureId);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/features/${featureId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete feature");
      }

      setFeatures(features.filter((f) => f.id !== featureId));
      setSuccess("Feature deleted successfully!");
      setTimeout(() => {
        router.refresh();
        setSuccess(null);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsDeleting(null);
    }
  };

  // Group features by category
  const groupedFeatures = features.reduce((acc, feature) => {
    const category = feature.category || "Other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(feature);
    return acc;
  }, {} as Record<string, Feature[]>);

  const categoryLabels: Record<string, string> = Object.fromEntries(
    categoryOptions.map((opt) => [opt.value, opt.label])
  );

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <Check className="h-4 w-4" />
          {success}
        </div>
      )}

      {/* Add Feature Form */}
      {isAdding && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Add New Feature</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Feature Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., SMS Notifications"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slug *
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., sms-notifications"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of the feature"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categoryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Feature
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Feature Button */}
      {!isAdding && !editingId && (
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Feature
        </Button>
      )}

      {/* Feature Matrix */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                  Feature
                </th>
                {plans.map((plan) => (
                  <th
                    key={plan.id}
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {plan.name}
                  </th>
                ))}
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(groupedFeatures).map(
                ([category, categoryFeatures]) => (
                  <>
                    {/* Category Header */}
                    <tr key={`category-${category}`} className="bg-gray-100">
                      <td
                        colSpan={plans.length + 2}
                        className="px-6 py-3 text-sm font-bold text-gray-700 sticky left-0 bg-gray-100"
                      >
                        {categoryLabels[category] || category}
                      </td>
                    </tr>

                    {/* Features in this category */}
                    {categoryFeatures.map((feature) => {
                      const enabledPlans = featureMap.get(feature.id) || new Set();
                      const isEditing = editingId === feature.id;

                      return (
                        <tr
                          key={feature.id}
                          className={isEditing ? "bg-blue-50" : ""}
                        >
                          {isEditing ? (
                            <>
                              <td
                                colSpan={plans.length + 2}
                                className="px-6 py-4"
                              >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Feature Name *
                                    </label>
                                    <input
                                      type="text"
                                      value={formData.name}
                                      onChange={(e) =>
                                        setFormData({
                                          ...formData,
                                          name: e.target.value,
                                        })
                                      }
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Slug *
                                    </label>
                                    <input
                                      type="text"
                                      value={formData.slug}
                                      onChange={(e) =>
                                        setFormData({
                                          ...formData,
                                          slug: e.target.value,
                                        })
                                      }
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                  </div>
                                  <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Description
                                    </label>
                                    <textarea
                                      value={formData.description}
                                      onChange={(e) =>
                                        setFormData({
                                          ...formData,
                                          description: e.target.value,
                                        })
                                      }
                                      rows={2}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Category *
                                    </label>
                                    <select
                                      value={formData.category}
                                      onChange={(e) =>
                                        setFormData({
                                          ...formData,
                                          category: e.target.value,
                                        })
                                      }
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                      {categoryOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                          {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                                <div className="flex gap-3 mt-4">
                                  <Button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    size="sm"
                                  >
                                    {isSaving ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                      </>
                                    ) : (
                                      <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Save
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={handleCancel}
                                    size="sm"
                                  >
                                    <X className="mr-2 h-4 w-4" />
                                    Cancel
                                  </Button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white">
                                <div className="text-sm font-medium text-gray-900">
                                  {feature.name}
                                </div>
                                {feature.description && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {feature.description}
                                  </div>
                                )}
                                <div className="text-xs text-gray-400 mt-1">
                                  {feature.slug}
                                </div>
                              </td>
                              {plans.map((plan) => {
                                const isEnabled = enabledPlans.has(plan.id);
                                return (
                                  <td key={plan.id} className="px-6 py-4 text-center">
                                    {isEnabled ? (
                                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100">
                                        <Check className="w-4 h-4 text-green-600" />
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100">
                                        <X className="w-4 h-4 text-gray-400" />
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEdit(feature)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleDelete(feature.id, feature.name)
                                    }
                                    disabled={isDeleting === feature.id}
                                  >
                                    {isDeleting === feature.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4 text-red-600" />
                                    )}
                                  </Button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
