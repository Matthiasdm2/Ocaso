import React from 'react';
// eslint-disable-next-line import/no-unresolved
import {
  IconCar,
  IconMotorbike,
  IconHome,
  IconBriefcase,
  IconTool,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconShirt,
  IconBallBasketball,
  IconBabyCarriage,
  IconPaw,
  IconTicket,
  IconSettings,
  IconLeaf,
  IconDeviceTv,
  IconDeviceGamepad,
  IconSailboat,
  IconDots,
} from '@tabler/icons-react';

interface CategoryIconProps {
  iconKey: string | null;
  className?: string;
}

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  'car': IconCar,
  'motorbike': IconMotorbike,
  'home': IconHome,
  'briefcase': IconBriefcase,
  'tool': IconTool,
  'device-desktop': IconDeviceDesktop,
  'device-mobile': IconDeviceMobile,
  'shirt': IconShirt,
  'ball-basketball': IconBallBasketball,
  'baby-carriage': IconBabyCarriage,
  'paw': IconPaw,
  'ticket': IconTicket,
  'wrench': IconSettings,
  'leaf': IconLeaf,
  'tv': IconDeviceTv,
  'gamepad': IconDeviceGamepad,
  'boat': IconSailboat,
  'dots': IconDots, // fallback
};

export function CategoryIcon({ iconKey, className = '' }: CategoryIconProps) {
  const IconComponent = iconKey ? iconMap[iconKey] : IconDots;

  if (!IconComponent) {
    return null;
  }

  return (
    <div className={`flex items-center justify-center w-7 h-7 rounded-xl bg-muted/10 border ${className}`}>
      <IconComponent size={18} className="text-foreground/80" />
    </div>
  );
}