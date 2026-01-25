# PRD: Card Height Consistency

## Overview
Standardize card heights across all content types (articles, videos, predictions) for a cleaner visual layout.

## Problem
- Polymarket cards are taller due to multi-question lists + metrics
- Article cards show only 2 lines of description
- Video cards show minimal info (title + channel)
- Inconsistent heights create a jagged, unpolished grid

## Solution

### 1. Expand Article/Video Content
- **Articles**: Show 4-5 lines of description (currently 2)
- **Videos**: Add video description text (currently none)
- Both card types will naturally match Polymarket height

### 2. Reduce Grid Columns
- Desktop: 3 columns instead of 4
- Cards get wider, more room for content
- Height differences less noticeable
- Easier to scan/read

## Technical Changes

### CardStream.tsx
- Change grid from `grid-cols-4` to `grid-cols-3` on xl breakpoints
- Adjust responsive breakpoints accordingly

### ArticleCard.tsx
- Change `line-clamp-2` to `line-clamp-4` for summary
- Ensure content/summary field is populated

### VideoCard.tsx
- Add description field display
- Show 3-4 lines of video description below title

## Success Metrics
- All cards visually same height (within ~10%)
- No truncation of critical info
- Improved readability scores

## Priority
High - Visual polish for launch

## Estimated Effort
Small - CSS and minor component changes
