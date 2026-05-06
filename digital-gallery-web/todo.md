# Digital Gallery Web - Project TODO

## Database & Backend
- [x] Create `galleryImages` table with id, title, description, imageUrl, imageKey, uploadedBy, createdAt, updatedAt
- [x] Add tRPC procedures: `gallery.list` (public), `gallery.upload` (protected), `gallery.update` (protected), `gallery.delete` (protected)
- [x] Implement S3 storage helpers for image upload and retrieval
- [x] Add owner-only authorization checks in protected procedures

## Hero Section & 3D Gallery
- [x] Design hero section with bold oversized typography ("Digital Gallery" or similar)
- [x] Create 3D scrolling image gallery with curved/tilted cards
- [x] Implement scroll-triggered animations for hero gallery cards
- [x] Add smooth parallax and tilt effects on scroll
- [x] Ensure responsive sizing for desktop, tablet, mobile

## Masonry Gallery Layout
- [x] Build masonry/grid gallery layout for all images
- [x] Add hover effects (zoom, overlay, color highlight)
- [x] Create lightbox component with image, title, description
- [x] Implement lightbox open/close animations
- [x] Add navigation (prev/next) in lightbox

## Owner Upload & Management Panel
- [x] Create owner-only upload panel (gated by authentication)
- [x] Build image upload form with title and description fields
- [x] Implement drag-and-drop file upload
- [x] Add image preview before upload
- [x] Create image management dashboard showing uploaded images
- [x] Add edit functionality for title/description
- [x] Add delete functionality with confirmation
- [x] Display upload status and error handling

## Styling & Design System
- [x] Set up color palette: black (#000), white (#FFF), lime green (#00FF00 or similar)
- [x] Configure Tailwind with custom color tokens
- [x] Add Google Fonts for large sans-serif typography
- [x] Create global styles for consistent spacing and typography
- [x] Implement smooth transitions and animations globally

## Animations & Interactions
- [x] Implement scroll-triggered animations using Framer Motion or similar
- [x] Add fade-in animations for gallery items on scroll
- [x] Create smooth page transitions
- [x] Add micro-interactions (button hover, card hover)
- [x] Ensure animations are smooth and never jarring

## Responsive Design
- [x] Test and optimize desktop layout (1920px+)
- [x] Test and optimize tablet layout (768px - 1024px)
- [x] Test and optimize mobile layout (320px - 767px)
- [x] Ensure hero gallery works on all screen sizes
- [x] Ensure masonry gallery adapts to screen size
- [x] Verify lightbox is usable on mobile

## Authentication & Authorization
- [x] Verify owner authentication flow
- [x] Gate upload panel to owner only
- [x] Ensure public users cannot access admin functions
- [x] Test logout functionality

## Testing
- [x] Write vitest tests for gallery procedures
- [x] Write vitest tests for authorization checks
- [x] Test image upload flow
- [x] Test image deletion flow
- [x] Test lightbox functionality
- [x] Cross-browser testing (Chrome, Firefox, Safari)

## Deployment & Final
- [x] Verify all images load correctly from S3
- [x] Test performance on slow networks
- [x] Create checkpoint
- [x] Deploy to production


## Bug Fixes
- [ ] Fix image upload failure - debug storage router and client-server communication
- [ ] Verify storage.put endpoint is working correctly
- [ ] Add better error messages for upload failures
- [ ] Test upload with various file sizes and formats
