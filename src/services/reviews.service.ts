import { apiService } from './api.service';
import { ReviewListResponse, PaginationParams } from '../types/api.types';

export interface GetReviewsParams extends PaginationParams {
  kitchenId?: string;
  rating?: number; // filter by star rating (1-5)
  sortBy?: 'recent' | 'rating-high' | 'rating-low';
}

class ReviewsService {
  /**
   * Fetch paginated reviews.
   * ADMIN reads all reviews via /admin/reviews (optionally scoped by kitchenId).
   * KITCHEN_STAFF reads only their kitchen's reviews via /kitchen/reviews
   * (backend derives the kitchen from the auth token).
   */
  async getReviews(isAdmin: boolean, params?: GetReviewsParams): Promise<ReviewListResponse> {
    const queryParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }

    const base = isAdmin ? '/api/orders/admin/reviews' : '/api/orders/kitchen/reviews';
    const queryString = queryParams.toString();
    const endpoint = `${base}${queryString ? `?${queryString}` : ''}`;

    const response = await apiService.get<{
      success: boolean;
      message: string;
      data: ReviewListResponse;
      error: null;
    }>(endpoint);

    return response.data;
  }
}

export const reviewsService = new ReviewsService();
