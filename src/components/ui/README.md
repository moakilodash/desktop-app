# Kaleidoswap UI Component Library

This directory contains reusable UI components for the Kaleidoswap desktop application. These components are designed to maintain a consistent look and feel across the application.

## Available Components

### Card Components

- `Card`: A standard card component with consistent styling
- `HoverCard`: A card with hover effects

### Button Components

- `Button`: Standard button with various variants and sizes
- `ActionButton`: Text button for actions like deposit, withdraw, etc.
- `IconButton`: Button with just an icon

### Loading Components

- `LoadingPlaceholder`: A loading placeholder with animation
- `TextLoadingPlaceholder`: A text loading placeholder with multiple lines
- `CardLoadingPlaceholder`: A card loading placeholder

### Tooltip Components

- `Tooltip`: A tooltip component that shows on hover
- `OverlayTooltip`: A tooltip with an overlay effect (covers the entire element)

### Badge Components

- `Badge`: Badge component for status indicators and labels
- `StatusBadge`: Status badge with a dot indicator

### Info Components

- `InfoCard`: InfoCard component for displaying information with an icon
- `InfoCardGrid`: A grid of info cards

### Alert Components

- `Alert`: Alert component for notifications, warnings, and errors
- `NetworkWarningAlert`: Network warning alert specifically for testnet warnings

## Usage

Import components from the UI library:

```tsx
import { Button, Card, LoadingPlaceholder } from '../../components/ui'
```

### Example

```tsx
<Card
  title="Assets"
  action={
    <Button
      icon={<Plus className="w-4 h-4" />}
      onClick={() => setShowIssueAssetModal(true)}
    >
      Issue Asset
    </Button>
  }
>
  <div className="rounded-lg overflow-hidden">{/* Card content */}</div>
</Card>
```

## Component Props

### Card

- `children`: ReactNode - Card content
- `className`: string (optional) - Additional CSS classes
- `title`: string | ReactNode (optional) - Card title
- `titleClassName`: string (optional) - Additional CSS classes for title
- `action`: ReactNode (optional) - Action element in the header
- `footer`: ReactNode (optional) - Footer element
- `noPadding`: boolean (optional) - Whether to remove padding

### Button

- `children`: ReactNode - Button content
- `variant`: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost' | 'link' (optional) - Button style variant
- `size`: 'sm' | 'md' | 'lg' (optional) - Button size
- `icon`: ReactNode (optional) - Icon to display
- `iconPosition`: 'left' | 'right' (optional) - Position of the icon
- `isLoading`: boolean (optional) - Whether to show loading state
- `fullWidth`: boolean (optional) - Whether to make the button full width
- `className`: string (optional) - Additional CSS classes
- `disabled`: boolean (optional) - Whether the button is disabled
- ...other button props

### LoadingPlaceholder

- `width`: string (optional) - Width of the placeholder
- `height`: string (optional) - Height of the placeholder
- `className`: string (optional) - Additional CSS classes
- `rounded`: boolean (optional) - Whether to round the corners

### InfoCard

- `icon`: ReactNode - Icon to display
- `label`: string - Label text
- `value`: string | ReactNode - Value to display
- `copyable`: boolean (optional) - Whether to show copy button
- `copyText`: string (optional) - Text to copy
- `copySuccessMessage`: string (optional) - Message to show on successful copy
- `className`: string (optional) - Additional CSS classes

## Styling

The components use Tailwind CSS for styling. You can customize the appearance by passing additional classes via the `className` prop.

## Adding New Components

When adding new components:

1. Create a new file for your component
2. Export the component from the file
3. Add the export to `index.ts`
4. Update this README with documentation for the new component
