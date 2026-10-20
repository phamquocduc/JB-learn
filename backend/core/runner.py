from django.test.runner import DiscoverRunner


class CustomDiscoverRunner(DiscoverRunner):
    """Custom test runner that defaults test_labels to ['cards', 'shadowing'] when none are provided."""

    def run_tests(self, test_labels, extra_tests=None, **kwargs):
        if not test_labels:
            test_labels = ["cards", "shadowing"]
        return super().run_tests(test_labels, extra_tests=extra_tests, **kwargs)

    def build_suite(self, test_labels=None, extra_tests=None, **kwargs):
        if not test_labels:
            test_labels = ["cards", "shadowing"]
        return super().build_suite(test_labels, extra_tests=extra_tests, **kwargs)

