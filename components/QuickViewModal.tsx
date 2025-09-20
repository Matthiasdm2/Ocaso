"use client";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";

interface QuickViewItem {
  id: string | number;
  title: string;
  images?: string[];
  location?: string;
  state?: string;
  price: number;
  description?: string;
}

export default function QuickViewModal({
  open,
  onClose,
  item,
}: {
  open: boolean;
  onClose: () => void;
  item: QuickViewItem;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-2xl p-4 w-full max-w-xl"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
          >
            <div className="flex gap-4">
              <div className="relative w-48 aspect-square rounded-xl overflow-hidden bg-gray-100">
                              {item.images && item.images.length > 0 && item.images[0] && (
                                <Image
                                  src={item.images[0]}
                                  alt={item.title}
                                  fill={true}
                                  className="object-cover"
                                />
                              )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{item.title}</h3>
                <div className="text-sm text-gray-600">
                  {item.location} • {item.state}
                </div>
                <div className="text-2xl font-bold mt-2">€ {item.price}</div>
                <p className="text-sm mt-2 line-clamp-3">{item.description}</p>
                <div className="mt-3 flex gap-2">
                  <a
                    href={`/listings/${item.id}`}
                    className="rounded-xl bg-primary text-black px-3 py-2 font-medium"
                  >
                    Bekijk
                  </a>
                  <button
                    onClick={onClose}
                    className="rounded-xl border px-3 py-2"
                  >
                    Sluiten
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
