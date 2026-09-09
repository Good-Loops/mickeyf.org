using System.Collections.Generic;
using System.Runtime.InteropServices;
using ThreeBosses.Run;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.Controls;
using UnityEngine.UI;

/// <summary>
/// Lets the embedded web page scroll from touches that begin outside Unity controls.
/// Gameplay receives its original input unchanged; the browser owns fullscreen policy.
/// </summary>
public sealed class WebPageTouchScroll : MonoBehaviour
{
    private readonly WebPageScrollGesture gesture = new();
    private readonly List<RaycastResult> raycastResults = new();
    private readonly List<MonoBehaviour> pointerHandlers = new();
    private EventSystem raycastEventSystem;
    private PointerEventData pointerEvent;
    private Touchscreen lastTouchscreen;
    private double lastTouchUpdateTime = double.NaN;
    private Vector2Int lastScreenSize;

#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")]
    private static extern void MickeyfThreeBossesScrollPage(float normalizedDelta);

    [DllImport("__Internal")]
    private static extern float MickeyfThreeBossesCanvasTopRatio();

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
    private static void Bootstrap()
    {
        var host = new GameObject("Three Bosses Page Touch Scroll", typeof(WebPageTouchScroll));
        DontDestroyOnLoad(host);
    }
#endif

    private void Update()
    {
        Touchscreen touchscreen = Touchscreen.current;
        if (touchscreen == null || Screen.height <= 0)
        {
            gesture.Reset();
            return;
        }

        if (touchscreen != lastTouchscreen)
        {
            gesture.Reset();
            lastTouchscreen = touchscreen;
            lastTouchUpdateTime = double.NaN;
        }

        // The document may scroll between input samples. Reusing a stale position
        // with the new canvas offset would turn our own scrolling into finger motion.
        if (touchscreen.lastUpdateTime == lastTouchUpdateTime)
            return;
        lastTouchUpdateTime = touchscreen.lastUpdateTime;

        int activeTouchCount = 0;
        int touchesSeenThisUpdate = 0;
        TouchControl activeTouch = null;
        foreach (TouchControl touch in touchscreen.touches)
        {
            if (touch.press.isPressed || touch.press.wasPressedThisFrame || touch.press.wasReleasedThisFrame)
                touchesSeenThisUpdate++;
            if (!touch.press.isPressed)
                continue;
            activeTouchCount++;
            activeTouch = touch;
        }

        var screenSize = new Vector2Int(Screen.width, Screen.height);
        if (lastScreenSize != Vector2Int.zero && lastScreenSize != screenSize)
            gesture.Observe(2, 0, 0f, 0f, false);
        lastScreenSize = screenSize;

        if (activeTouchCount != 1)
        {
            gesture.Observe(activeTouchCount, 0, 0f, 0f, false);
            return;
        }

        // A second finger can begin and end between two rendered frames.
        if (touchesSeenThisUpdate > 1)
        {
            gesture.Observe(2, 0, 0f, 0f, false);
            return;
        }

        Vector2 position = activeTouch.position.ReadValue();
        bool startsOverControl = gesture.NeedsTouchOrigin && IsInteractiveTouchOrigin(position);
        float normalizedY = position.y / Screen.height;
#if UNITY_WEBGL && !UNITY_EDITOR
        normalizedY -= MickeyfThreeBossesCanvasTopRatio();
#endif
        float delta = gesture.Observe(
            activeTouchCount,
            activeTouch.touchId.ReadValue(),
            position.x / Screen.height,
            normalizedY,
            startsOverControl);

#if UNITY_WEBGL && !UNITY_EDITOR
        if (delta != 0f)
            MickeyfThreeBossesScrollPage(delta);
#endif
    }

    private bool IsInteractiveTouchOrigin(Vector2 position)
    {
        EventSystem current = EventSystem.current;
        if (current == null)
            return true;

        if (raycastEventSystem != current)
        {
            raycastEventSystem = current;
            pointerEvent = new PointerEventData(current);
        }

        pointerEvent.Reset();
        pointerEvent.position = position;
        raycastResults.Clear();
        current.RaycastAll(pointerEvent, raycastResults);

        foreach (RaycastResult result in raycastResults)
        {
            result.gameObject.GetComponentsInParent(false, pointerHandlers);
            foreach (MonoBehaviour handler in pointerHandlers)
            {
                if (handler == null || !handler.isActiveAndEnabled)
                    continue;
                if (handler is Selectable selectable)
                {
                    if (selectable.IsInteractable())
                        return true;
                    continue;
                }
                if (handler is IPointerDownHandler || handler is IDragHandler
                    || handler is IPointerClickHandler)
                    return true;
            }
        }

        return false;
    }

    private void OnDisable()
    {
        gesture.Reset();
    }

    private void OnApplicationFocus(bool hasFocus)
    {
        if (!hasFocus)
            gesture.Observe(2, 0, 0f, 0f, false);
    }
}
