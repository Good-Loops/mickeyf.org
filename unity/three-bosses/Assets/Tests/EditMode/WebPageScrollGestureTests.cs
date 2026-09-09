using NUnit.Framework;

namespace ThreeBosses.Run.Tests
{
    public sealed class WebPageScrollGestureTests
    {
        private WebPageScrollGesture gesture;

        [SetUp]
        public void SetUp()
        {
            gesture = new WebPageScrollGesture();
        }

        [Test]
        public void TapAndSmallMovementDoNotScroll()
        {
            Observe(0.5f, 0.5f);
            Assert.That(Observe(0.51f, 0.51f), Is.Zero);
            Assert.That(gesture.Observe(0, 1, 0.5f, 0.5f, false), Is.Zero);
            Assert.That(gesture.NeedsTouchOrigin, Is.True);
        }

        [Test]
        public void UpwardDragEmitsIncrementalPositiveDeltasAndCanReverse()
        {
            Observe(0.5f, 0.5f);
            Assert.That(Observe(0.5f, 0.55f), Is.EqualTo(0.05f).Within(0.0001f));
            Assert.That(Observe(0.5f, 0.57f), Is.EqualTo(0.02f).Within(0.0001f));
            Assert.That(Observe(0.5f, 0.53f), Is.EqualTo(-0.04f).Within(0.0001f));
            Assert.That(Observe(0.5f, 0.53f), Is.Zero);
        }

        [Test]
        public void ControlOwnsItsGestureEvenAfterFingerLeavesTheControl()
        {
            gesture.Observe(1, 1, 0.5f, 0.5f, true);
            Assert.That(Observe(0.5f, 0.8f), Is.Zero);
            Assert.That(Observe(0.5f, 0.2f), Is.Zero);
        }

        [Test]
        public void PassingOverControlAfterStartingOnBackgroundDoesNotChangeOwnership()
        {
            Observe(0.5f, 0.5f);
            Assert.That(gesture.Observe(1, 1, 0.5f, 0.6f, true),
                Is.EqualTo(0.1f).Within(0.0001f));
        }

        [Test]
        public void HorizontalIntentDoesNotTurnIntoScrollingLater()
        {
            Observe(0.5f, 0.5f);
            Assert.That(Observe(0.6f, 0.51f), Is.Zero);
            Assert.That(Observe(0.6f, 0.9f), Is.Zero);
        }

        [Test]
        public void DiagonalIntentIsReservedForGameplay()
        {
            Observe(0.5f, 0.5f);
            Assert.That(Observe(0.55f, 0.55f), Is.Zero);
            Assert.That(Observe(0.55f, 0.9f), Is.Zero);
        }

        [Test]
        public void SecondTouchStopsScrollingUntilEveryFingerLifts()
        {
            Observe(0.5f, 0.5f);
            Observe(0.5f, 0.6f);
            Assert.That(gesture.Observe(2, 1, 0.5f, 0.7f, false), Is.Zero);
            Assert.That(Observe(0.5f, 0.9f), Is.Zero);
            gesture.Observe(0, 0, 0f, 0f, false);
            Observe(0.5f, 0.5f);
            Assert.That(Observe(0.5f, 0.6f), Is.GreaterThan(0f));
        }

        [Test]
        public void DifferentTouchIdCannotTakeOverAnUnfinishedSequence()
        {
            Observe(0.5f, 0.5f);
            Assert.That(gesture.Observe(1, 2, 0.5f, 0.6f, false), Is.Zero);
            Assert.That(gesture.Observe(1, 2, 0.5f, 0.9f, false), Is.Zero);
        }

        [Test]
        public void InvalidCoordinateDisablesGestureUntilRelease()
        {
            Observe(0.5f, 0.5f);
            Assert.That(Observe(0.5f, float.NaN), Is.Zero);
            Assert.That(Observe(0.5f, 0.9f), Is.Zero);
        }

        [Test]
        public void ResetAllowsAFreshGestureAfterAReservedSequence()
        {
            gesture.Observe(1, 1, 0.5f, 0.5f, true);
            gesture.Reset();
            Observe(0.5f, 0.5f);
            Assert.That(Observe(0.5f, 0.6f), Is.GreaterThan(0f));
        }

        private float Observe(float x, float y)
        {
            return gesture.Observe(1, 1, x, y, false);
        }
    }
}
