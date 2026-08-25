// An item's lifecycle. Two of these are endings:
//
//   inventory → listed → sold      the money came back
//                      → donated   it did not, and the cost is written off
//
// Anything still in `inventory` or `listed` is stock you actually hold, which is
// what "cash tied up" and the aging buckets are asking about. Sold and donated
// items have both left the shelf, so they must not be counted there.

export const STATUS = {
  inventory: 'inventory',
  listed: 'listed',
  sold: 'sold',
  donated: 'donated',
}

export const STATUS_LABELS = {
  inventory: 'In stock',
  listed: 'Listed',
  sold: 'Sold',
  donated: 'Donated',
}

export const isOnHand = (item) =>
  item?.status === STATUS.inventory || item?.status === STATUS.listed

export const isSold = (item) => item?.status === STATUS.sold

export const isDonated = (item) => item?.status === STATUS.donated

// Where an item goes when a sale or donation is undone: back to listed if it is
// still on a platform, otherwise into plain stock.
export const statusAfterUndo = (item) =>
  item?.platforms?.length ? STATUS.listed : STATUS.inventory
