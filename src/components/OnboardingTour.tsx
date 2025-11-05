import Joyride, { Step, CallBackProps, STATUS } from "react-joyride";
import { useTheme } from "next-themes";

interface OnboardingTourProps {
  run: boolean;
  steps: Step[];
  onFinish: () => void;
}

export function OnboardingTour({ run, steps, onFinish }: OnboardingTourProps) {
  const { theme } = useTheme();

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      onFinish();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: "hsl(217, 91%, 60%)",
          textColor: theme === "dark" ? "hsl(210, 40%, 98%)" : "hsl(222, 47%, 11%)",
          backgroundColor: theme === "dark" ? "hsl(222, 47%, 15%)" : "hsl(0, 0%, 100%)",
          overlayColor: theme === "dark" ? "rgba(0, 0, 0, 0.7)" : "rgba(0, 0, 0, 0.5)",
          zIndex: 10000,
        },
      }}
      locale={{
        back: "Anterior",
        close: "Fechar",
        last: "Concluir",
        next: "Próximo",
        skip: "Saltar Tour",
      }}
    />
  );
}
