using System;
using System.Collections;
using System.Linq;
using System.Reflection;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using UnityEngine.UI;

namespace ThreeBosses.Tests
{
    public sealed class PortraitOutcomeLayoutTests
    {
        private static readonly OutcomeSceneContract[] SceneContracts =
        {
            new(
                "Transition_BeeToCyborg",
                "Bee",
                true,
                new TextLayoutContract(
                    "Boss Split Caption",
                    new Vector2(74f, -58f),
                    new Vector2(300f, 30f),
                    new Vector2(-150f, -315f),
                    new Vector2(300f, 36f),
                    "Left"),
                new TextLayoutContract(
                    "Boss Split Value",
                    new Vector2(74f, -88f),
                    new Vector2(300f, 44f),
                    new Vector2(150f, -315f),
                    new Vector2(300f, 36f),
                    "Left")),
            new(
                "Transition_CyborgToKraken",
                "Cyborg",
                true,
                new TextLayoutContract(
                    "Boss Split Caption",
                    new Vector2(74f, -58f),
                    new Vector2(300f, 30f),
                    new Vector2(-150f, -298f),
                    new Vector2(300f, 36f),
                    "Left"),
                new TextLayoutContract(
                    "Boss Split Value",
                    new Vector2(74f, -88f),
                    new Vector2(300f, 44f),
                    new Vector2(150f, -298f),
                    new Vector2(300f, 36f),
                    "Left")),
            new(
                "Defeat_Bee",
                "Bee",
                false,
                new TextLayoutContract(
                    "Time Survived Value",
                    new Vector2(535f, -580f),
                    new Vector2(605f, 72f),
                    new Vector2(0f, -580f),
                    new Vector2(605f, 72f),
                    "Center")),
            new(
                "Defeat_Cyborg",
                "Cyborg",
                false,
                new TextLayoutContract(
                    "Time Survived Value",
                    new Vector2(571f, -592f),
                    new Vector2(570f, 74f),
                    new Vector2(20f, -592f),
                    new Vector2(570f, 74f),
                    "Center"),
                new TextLayoutContract(
                    "Time Survived Caption",
                    new Vector2(706f, -552f),
                    new Vector2(300f, 40f),
                    new Vector2(20f, -552f),
                    new Vector2(300f, 40f),
                    "Center")),
            new(
                "Defeat_Kraken",
                "Kraken",
                false,
                new TextLayoutContract(
                    "Time Survived Value",
                    new Vector2(570f, -592f),
                    new Vector2(570f, 74f),
                    new Vector2(19f, -592f),
                    new Vector2(570f, 74f),
                    "Center"),
                new TextLayoutContract(
                    "Time Survived Caption",
                    new Vector2(705f, -552f),
                    new Vector2(300f, 40f),
                    new Vector2(19f, -552f),
                    new Vector2(300f, 40f),
                    "Center")),
        };

        private static readonly ButtonLabelContract[] DefeatButtonContracts =
        {
            new("Try Again Button", "TRY AGAIN"),
            new("Back To Menu Button", "BACK TO MENU"),
        };

        [UnityTest]
        public IEnumerator OutcomeScenesCenterConfiguredTextOnlyForPortraitUi()
        {
            Type serviceType = RequireRuntimeType("RunSessionService");
            Component service = serviceType.GetProperty(
                    "Instance",
                    BindingFlags.Public | BindingFlags.Static)
                ?.GetValue(null) as Component;
            Assert.That(service, Is.Not.Null);

            MethodInfo configurePortraitLayout = serviceType.GetMethod(
                "ConfigurePortraitUiLayout",
                BindingFlags.Public | BindingFlags.Instance);
            Assert.That(configurePortraitLayout, Is.Not.Null);
            configurePortraitLayout.Invoke(service, new object[] { "0" });
            object session = serviceType.GetProperty(
                    "Session",
                    BindingFlags.Public | BindingFlags.Instance)
                ?.GetValue(service);
            Assert.That(session, Is.Not.Null);

            foreach (OutcomeSceneContract contract in SceneContracts)
            {
                PrepareOutcomeSession(session, contract.BossName, contract.IsTransition);
                SceneManager.LoadScene(contract.SceneName);
                yield return null;

                Type layoutType = RequireRuntimeType("PortraitTextGroupLayout");
                Component[] layouts = SceneManager.GetActiveScene()
                    .GetRootGameObjects()
                    .SelectMany(root => root.GetComponentsInChildren(layoutType, true))
                    .ToArray();
                Assert.That(layouts, Has.Length.EqualTo(1), contract.SceneName);

                FieldInfo targetsField = layoutType.GetField(
                    "textTargets",
                    BindingFlags.Instance | BindingFlags.NonPublic);
                Assert.That(targetsField, Is.Not.Null, contract.SceneName);
                Array targetArray = targetsField.GetValue(layouts[0]) as Array;
                Assert.That(targetArray, Is.Not.Null, contract.SceneName);
                Component[] targets = targetArray.Cast<Component>().ToArray();
                Assert.That(
                    targets.Select(target => target.name),
                    Is.EqualTo(contract.TextTargets.Select(target => target.Name)),
                    contract.SceneName);

                if (!contract.IsTransition)
                    AssertDefeatButtonLabelsCentered(contract.SceneName);

                for (int index = 0; index < targets.Length; index++)
                {
                    Component target = targets[index];
                    TextLayoutContract expected = contract.TextTargets[index];
                    RectTransform rectTransform = target.GetComponent<RectTransform>();
                    Assert.That(rectTransform.anchorMin, Is.EqualTo(new Vector2(0f, 1f)), contract.SceneName);
                    Assert.That(rectTransform.anchorMax, Is.EqualTo(new Vector2(0f, 1f)), contract.SceneName);
                    Assert.That(rectTransform.pivot, Is.EqualTo(new Vector2(0f, 1f)), contract.SceneName);
                    Assert.That(rectTransform.anchoredPosition, Is.EqualTo(expected.DesktopPosition), contract.SceneName);
                    Assert.That(rectTransform.sizeDelta, Is.EqualTo(expected.DesktopSize), contract.SceneName);
                    Assert.That(
                        target.GetType().GetProperty("alignment")?.GetValue(target)?.ToString(),
                        Is.EqualTo(expected.DesktopAlignment),
                        contract.SceneName);
                }

                configurePortraitLayout.Invoke(service, new object[] { "1" });
                for (int index = 0; index < targets.Length; index++)
                {
                    Component target = targets[index];
                    TextLayoutContract expected = contract.TextTargets[index];
                    RectTransform rectTransform = target.GetComponent<RectTransform>();
                    Assert.That(rectTransform.anchorMin, Is.EqualTo(new Vector2(0.5f, 1f)), contract.SceneName);
                    Assert.That(rectTransform.anchorMax, Is.EqualTo(new Vector2(0.5f, 1f)), contract.SceneName);
                    Assert.That(rectTransform.pivot, Is.EqualTo(new Vector2(0.5f, 1f)), contract.SceneName);
                    Assert.That(rectTransform.anchoredPosition, Is.EqualTo(expected.PortraitPosition), contract.SceneName);
                    Assert.That(rectTransform.sizeDelta, Is.EqualTo(expected.PortraitSize), contract.SceneName);
                    Assert.That(
                        target.GetType().GetProperty("alignment")?.GetValue(target)?.ToString(),
                        Is.EqualTo("Center"),
                        contract.SceneName);
                }

                if (!contract.IsTransition)
                    AssertDefeatButtonLabelsCentered(contract.SceneName);

                configurePortraitLayout.Invoke(service, new object[] { "0" });
                for (int index = 0; index < targets.Length; index++)
                {
                    Component target = targets[index];
                    TextLayoutContract expected = contract.TextTargets[index];
                    RectTransform rectTransform = target.GetComponent<RectTransform>();
                    Assert.That(rectTransform.anchorMin, Is.EqualTo(new Vector2(0f, 1f)), contract.SceneName);
                    Assert.That(rectTransform.anchorMax, Is.EqualTo(new Vector2(0f, 1f)), contract.SceneName);
                    Assert.That(rectTransform.pivot, Is.EqualTo(new Vector2(0f, 1f)), contract.SceneName);
                    Assert.That(rectTransform.anchoredPosition, Is.EqualTo(expected.DesktopPosition), contract.SceneName);
                    Assert.That(rectTransform.sizeDelta, Is.EqualTo(expected.DesktopSize), contract.SceneName);
                    Assert.That(
                        target.GetType().GetProperty("alignment")?.GetValue(target)?.ToString(),
                        Is.EqualTo(expected.DesktopAlignment),
                        contract.SceneName);
                }

                if (!contract.IsTransition)
                    AssertDefeatButtonLabelsCentered(contract.SceneName);
            }
        }

        [UnityTest]
        public IEnumerator CyborgDefeatLabelsStayCenteredOnPaintedArtworkAcrossHostLayoutModes()
        {
            // Inner rims: panel x=564..1148; buttons x=457..789 / 880..1227, y=738..852.
            yield return AssertDefeatArtworkCenters("Cyborg", 856f, 623f, 1053.5f);
        }

        [UnityTest]
        public IEnumerator KrakenDefeatLabelsStayCenteredOnPaintedArtworkAcrossHostLayoutModes()
        {
            // Independently measured Kraken rims differ from Cyborg despite the similar design.
            // Panel x=564..1146; buttons x=459..789 / 879..1224, y=738..852.
            yield return AssertDefeatArtworkCenters("Kraken", 855f, 624f, 1051.5f);
        }

        private static IEnumerator AssertDefeatArtworkCenters(
            string bossName, float panelCenter, float retryCenter, float menuCenter)
        {
            Type serviceType = RequireRuntimeType("RunSessionService");
            object service = serviceType.GetProperty("Instance", BindingFlags.Public | BindingFlags.Static)?.GetValue(null);
            Assert.That(service, Is.Not.Null);
            object session = serviceType.GetProperty("Session")?.GetValue(service);
            MethodInfo configurePortraitLayout = serviceType.GetMethod("ConfigurePortraitUiLayout");
            Assert.That(configurePortraitLayout, Is.Not.Null);
            configurePortraitLayout.Invoke(service, new object[] { "0" });
            PrepareOutcomeSession(session, bossName, false);
            SceneManager.LoadScene($"Defeat_{bossName}");
            yield return null;

            Image background = GameObject.Find("Background")?.GetComponent<Image>();
            Assert.That(background, Is.Not.Null);
            RectTransform artwork = background.rectTransform;
            RectTransform artRoot = artwork.parent as RectTransform;
            Assert.That(artRoot, Is.Not.Null);
            artRoot.GetComponent<AspectRatioFitter>().enabled = false;
            Vector2 artworkSize = background.sprite.rect.size;
            artRoot.SetSizeWithCurrentAnchors(RectTransform.Axis.Horizontal, artworkSize.x);
            artRoot.SetSizeWithCurrentAnchors(RectTransform.Axis.Vertical, artworkSize.y);

            var targets = new[]
            {
                (Path: "Time Survived Caption", Center: new Vector2(panelCenter, 572f)),
                (Path: "Time Survived Value", Center: new Vector2(panelCenter, 629f)),
                (Path: "Try Again Button/Label", Center: new Vector2(retryCenter, 795f)),
                (Path: "Back To Menu Button/Label", Center: new Vector2(menuCenter, 795f)),
            };
            Image captionBacking = artRoot.Find("Time Survived Caption Backing")?.GetComponent<Image>();
            Assert.That(captionBacking, Is.Not.Null);
            Assert.That(captionBacking.raycastTarget, Is.False);
            Assert.That(captionBacking.color.a, Is.EqualTo(1f));
            RectTransform captionRect = artRoot.Find("Time Survived Caption") as RectTransform;
            Assert.That(captionBacking.transform.GetSiblingIndex(), Is.LessThan(captionRect.GetSiblingIndex()));
            foreach (string portraitMode in new[] { "0", "1", "0" })
            {
                configurePortraitLayout.Invoke(service, new object[] { portraitMode });
                Canvas.ForceUpdateCanvases();
                foreach (var target in targets)
                {
                    RectTransform label = artRoot.Find(target.Path) as RectTransform;
                    Assert.That(label, Is.Not.Null, target.Path);
                    Vector3 localCenter = artwork.InverseTransformPoint(label.TransformPoint(label.rect.center));
                    Vector2 pixelCenter = new(
                        (localCenter.x - artwork.rect.xMin) / artwork.rect.width * artworkSize.x,
                        (artwork.rect.yMax - localCenter.y) / artwork.rect.height * artworkSize.y);
                    Assert.That(Vector2.Distance(pixelCenter, target.Center), Is.LessThan(1f),
                        $"{target.Path}, portrait mode {portraitMode}: center {pixelCenter} must match painted artwork {target.Center}");
                }
                AssertDefeatButtonLabelsCentered($"Defeat_{bossName}");
            }
        }

        [UnityTest]
        public IEnumerator EndSceneKeepsAllValuesCenteredOnArtworkCaptionsAcrossHostLayoutModes()
        {
            Type serviceType = RequireRuntimeType("RunSessionService");
            object service = serviceType.GetProperty(
                    "Instance",
                    BindingFlags.Public | BindingFlags.Static)
                ?.GetValue(null);
            Assert.That(service, Is.Not.Null);
            object session = serviceType.GetProperty("Session")?.GetValue(service);
            Assert.That(session, Is.Not.Null);
            MethodInfo configurePortraitLayout = serviceType.GetMethod("ConfigurePortraitUiLayout");
            Assert.That(configurePortraitLayout, Is.Not.Null);
            Type textType = Type.GetType("TMPro.TextMeshProUGUI, Unity.TextMeshPro");
            Assert.That(textType, Is.Not.Null);

            foreach (string rank in new[] { "S", "A", "B", "C", "D", "UNRANKED" })
            {
                configurePortraitLayout.Invoke(service, new object[] { "0" });
                PrepareOutcomeSession(session, "Kraken", true);
                Assert.That(
                    session.GetType().GetMethod("TrySetResult")?.Invoke(
                        session,
                        new object[] { rank == "UNRANKED" ? 0 : 1, rank }),
                    Is.True,
                    rank);
                SceneManager.LoadScene("End");
                yield return null;

                GameObject rankObject = GameObject.Find("Rank Value");
                Assert.That(rankObject, Is.Not.Null, rank);
                Component rankLabel = rankObject.GetComponent(textType);
                Assert.That(rankLabel, Is.Not.Null, rank);
                RectTransform rankRect = rankObject.GetComponent<RectTransform>();
                Image background = GameObject.Find("Background")?.GetComponent<Image>();
                Assert.That(background, Is.Not.Null, rank);
                Assert.That(background.sprite, Is.Not.Null, rank);
                RectTransform artwork = background.rectTransform;
                RectTransform artRoot = artwork.parent as RectTransform;
                Assert.That(artRoot, Is.Not.Null, rank);

                // Check the authored artwork coordinates independently of the Editor's Game-view aspect.
                AspectRatioFitter fitter = artRoot.GetComponent<AspectRatioFitter>();
                Assert.That(fitter, Is.Not.Null, rank);
                fitter.enabled = false;
                Vector2 artworkSize = background.sprite.rect.size;
                artRoot.SetSizeWithCurrentAnchors(RectTransform.Axis.Horizontal, artworkSize.x);
                artRoot.SetSizeWithCurrentAnchors(RectTransform.Axis.Vertical, artworkSize.y);

                foreach (string portraitMode in new[] { "0", "1", "0" })
                {
                    configurePortraitLayout.Invoke(service, new object[] { portraitMode });
                    Canvas.ForceUpdateCanvases();
                    string context = $"{rank}, portrait mode {portraitMode}";
                    Assert.That(textType.GetProperty("text")?.GetValue(rankLabel), Is.EqualTo(rank), context);
                    Assert.That(
                        textType.GetProperty("alignment")?.GetValue(rankLabel)?.ToString(),
                        Is.EqualTo("Center"),
                        context);
                    Assert.That(
                        textType.GetProperty("margin")?.GetValue(rankLabel),
                        Is.EqualTo(Vector4.zero),
                        context);

                    Vector3 centerInArtwork = artwork.InverseTransformPoint(
                        rankRect.TransformPoint(rankRect.rect.center));
                    float centerInArtworkPixels =
                        (centerInArtwork.x - artwork.rect.xMin) / artwork.rect.width * artworkSize.x;
                    // The baked RANK caption spans source pixels 1122 through 1184.
                    Assert.That(centerInArtworkPixels, Is.EqualTo(1153f).Within(1f), context);
                    // Independent baked-caption centers; don't validate against their own RectTransforms.
                    foreach (var readout in new[]
                    {
                        (Name: "Completion Time Value", CenterX: 535f),
                        (Name: "Score Value", CenterX: 833f),
                    })
                    {
                        RectTransform value = artRoot.Find(readout.Name) as RectTransform;
                        Assert.That(value, Is.Not.Null, readout.Name);
                        Vector3 localCenter = artwork.InverseTransformPoint(value.TransformPoint(value.rect.center));
                        float pixelX = (localCenter.x - artwork.rect.xMin) / artwork.rect.width * artworkSize.x;
                        Assert.That(pixelX, Is.EqualTo(readout.CenterX).Within(1f), $"{context} {readout.Name}");
                    }
                }
            }
        }

        [UnityTearDown]
        public IEnumerator TearDown()
        {
            Time.timeScale = 1f;
            SceneManager.LoadScene("MainMenu");
            yield return null;

            Type serviceType = Type.GetType("RunSessionService, Assembly-CSharp");
            MonoBehaviour service = serviceType == null
                ? null
                : UnityEngine.Object.FindFirstObjectByType(serviceType) as MonoBehaviour;
            if (service != null)
                UnityEngine.Object.Destroy(service.gameObject);
        }

        private static Type RequireRuntimeType(string name)
        {
            Type type = Type.GetType($"{name}, Assembly-CSharp");
            Assert.That(type, Is.Not.Null, $"Type {name} was not found.");
            return type;
        }

        private static void PrepareOutcomeSession(object session, string bossName, bool isTransition)
        {
            Type sessionType = session.GetType();
            Type bossIdType = sessionType.Assembly.GetType("ThreeBosses.Run.BossId");
            Assert.That(bossIdType, Is.Not.Null);
            object boss = Enum.Parse(bossIdType, bossName);

            if (isTransition && bossName == "Bee")
            {
                sessionType.GetMethod("BeginNewRun")?.Invoke(session, null);
                Assert.That(sessionType.GetMethod("StartRun")?.Invoke(session, null), Is.True);
            }
            else
            {
                sessionType.GetMethod("BeginPractice")?.Invoke(session, new[] { boss });
            }

            string outcomeMethod = isTransition ? "RecordBossDefeat" : "RecordDeath";
            object outcome = sessionType.GetMethod(outcomeMethod)?.Invoke(
                session,
                isTransition ? new[] { boss } : null);
            Assert.That(outcome, Is.Not.Null, $"{outcomeMethod} did not return a result.");
        }

        private static void AssertDefeatButtonLabelsCentered(string sceneName)
        {
            RectTransform[] sceneRects = SceneManager.GetActiveScene()
                .GetRootGameObjects()
                .SelectMany(root => root.GetComponentsInChildren<RectTransform>(true))
                .ToArray();
            Type textType = Type.GetType("TMPro.TextMeshProUGUI, Unity.TextMeshPro");
            Assert.That(textType, Is.Not.Null, "TextMeshProUGUI was not found.");

            foreach (ButtonLabelContract contract in DefeatButtonContracts)
            {
                RectTransform buttonRect = sceneRects.Single(
                    candidate => candidate.name == contract.ButtonName);
                RectTransform labelRect = buttonRect.Find("Label") as RectTransform;
                Assert.That(labelRect, Is.Not.Null, $"{sceneName} {contract.ButtonName}");

                Component label = labelRect.GetComponent(textType);
                Assert.That(label, Is.Not.Null, $"{sceneName} {contract.ButtonName}");
                Assert.That(
                    textType.GetProperty("text")?.GetValue(label),
                    Is.EqualTo(contract.Text),
                    $"{sceneName} {contract.ButtonName}");
                Assert.That(
                    textType.GetProperty("alignment")?.GetValue(label)?.ToString(),
                    Is.EqualTo("Center"),
                    $"{sceneName} {contract.ButtonName}");

                Assert.That(labelRect.anchorMin, Is.EqualTo(Vector2.zero), sceneName);
                Assert.That(labelRect.anchorMax, Is.EqualTo(Vector2.one), sceneName);
                Assert.That(labelRect.pivot, Is.EqualTo(new Vector2(0.5f, 0.5f)), sceneName);
                Assert.That(labelRect.anchoredPosition, Is.EqualTo(Vector2.zero), sceneName);
                Assert.That(labelRect.sizeDelta, Is.EqualTo(Vector2.zero), sceneName);

                Vector3 buttonCenter = buttonRect.TransformPoint(buttonRect.rect.center);
                Vector3 labelCenter = labelRect.TransformPoint(labelRect.rect.center);
                Assert.That(
                    Vector3.Distance(buttonCenter, labelCenter),
                    Is.LessThan(0.001f),
                    $"{sceneName} {contract.ButtonName} label must stay centered in its button.");
            }
        }

        private sealed class OutcomeSceneContract
        {
            public OutcomeSceneContract(
                string sceneName,
                string bossName,
                bool isTransition,
                params TextLayoutContract[] textTargets)
            {
                SceneName = sceneName;
                BossName = bossName;
                IsTransition = isTransition;
                TextTargets = textTargets;
            }

            public string SceneName { get; }
            public string BossName { get; }
            public bool IsTransition { get; }
            public TextLayoutContract[] TextTargets { get; }
        }

        private readonly struct TextLayoutContract
        {
            public TextLayoutContract(
                string name,
                Vector2 desktopPosition,
                Vector2 desktopSize,
                Vector2 portraitPosition,
                Vector2 portraitSize,
                string desktopAlignment)
            {
                Name = name;
                DesktopPosition = desktopPosition;
                DesktopSize = desktopSize;
                PortraitPosition = portraitPosition;
                PortraitSize = portraitSize;
                DesktopAlignment = desktopAlignment;
            }

            public string Name { get; }
            public Vector2 DesktopPosition { get; }
            public Vector2 DesktopSize { get; }
            public Vector2 PortraitPosition { get; }
            public Vector2 PortraitSize { get; }
            public string DesktopAlignment { get; }
        }

        private readonly struct ButtonLabelContract
        {
            public ButtonLabelContract(string buttonName, string text)
            {
                ButtonName = buttonName;
                Text = text;
            }

            public string ButtonName { get; }
            public string Text { get; }
        }
    }
}
