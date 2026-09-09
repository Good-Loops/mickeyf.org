using System;

namespace ThreeBosses.Run
{
    /// <summary>
    /// Gives one uninterrupted touch sequence to either gameplay or page scrolling.
    /// Positions and returned deltas are measured in displayed canvas heights.
    /// </summary>
    public sealed class WebPageScrollGesture
    {
        private const float IntentThreshold = 0.025f;
        private const float VerticalDominance = 1.25f;

        private enum GestureState { Idle, Pending, Scrolling, Reserved }

        private GestureState state;
        private int trackedTouchId;
        private float startX;
        private float startY;
        private float previousY;

        public bool NeedsTouchOrigin => state == GestureState.Idle;

        public float Observe(int touchCount, int touchId, float x, float y, bool startsOverControl)
        {
            if (touchCount == 0)
            {
                Reset();
                return 0f;
            }

            if (touchCount != 1 || !IsFinite(x) || !IsFinite(y))
            {
                state = GestureState.Reserved;
                return 0f;
            }

            if (state == GestureState.Reserved)
                return 0f;

            if (state == GestureState.Idle)
            {
                state = startsOverControl ? GestureState.Reserved : GestureState.Pending;
                trackedTouchId = touchId;
                startX = x;
                startY = y;
                previousY = y;
                return 0f;
            }

            if (trackedTouchId != touchId)
            {
                state = GestureState.Reserved;
                return 0f;
            }

            if (state == GestureState.Pending)
            {
                float horizontalDistance = Math.Abs(x - startX);
                float verticalDistance = Math.Abs(y - startY);
                if (Math.Max(horizontalDistance, verticalDistance) < IntentThreshold)
                    return 0f;

                if (verticalDistance < horizontalDistance * VerticalDominance)
                {
                    state = GestureState.Reserved;
                    return 0f;
                }

                state = GestureState.Scrolling;
            }

            float delta = y - previousY;
            previousY = y;
            return delta;
        }

        public void Reset()
        {
            state = GestureState.Idle;
        }

        private static bool IsFinite(float value)
        {
            return !float.IsNaN(value) && !float.IsInfinity(value);
        }
    }
}
