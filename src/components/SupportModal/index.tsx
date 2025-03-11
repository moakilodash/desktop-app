import { openUrl } from '@tauri-apps/plugin-opener'
import {
  HelpCircle,
  BookOpen,
  MessageCircle,
  Github,
  ExternalLink,
  X,
  ArrowRight,
  FileText,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'

interface SupportModalProps {
  isOpen: boolean
  onClose: () => void
}

interface SupportButtonProps {
  onClick: () => void
}

interface CommonIssue {
  title: string
  description: string
  solutions: string[]
}

export const SupportModal = ({ isOpen, onClose }: SupportModalProps) => {
  const [activeSection, setActiveSection] = useState('main')
  const [expandedIssue, setExpandedIssue] = useState<number | null>(null)

  if (!isOpen) return null

  const openExternalLink = (url: string) => {
    openUrl(url)
    // Keep the modal open for potential further exploration
  }

  // Common issues for the troubleshooting section
  const COMMON_ISSUES: CommonIssue[] = [
    {
      description: 'Problems connecting to your RGB Lightning Node',
      solutions: [
        'Check that your node is running',
        'Verify your connection settings in the Settings page',
        'Ensure your firewall allows connections to the required ports',
        'Try restarting your node',
      ],
      title: 'Connection issues',
    },
    {
      description: 'Issues when trying to create new payment channels',
      solutions: [
        'Ensure you have sufficient Bitcoin balance',
        'Check that your peer is online and accepting channels',
        'Verify you and your peer are connected to the same RGB proxy server',
        'Wait for any pending blockchain confirmations',
      ],
      title: 'Channel creation failures',
    },
    {
      description: 'Problems sending or receiving RGB payments',
      solutions: [
        'Verify you have sufficient outbound liquidity in your channels',
        'Check that have enough colored UTXOs in your wallet',
        'Verify the invoice is correct and not expired',
      ],
      title: 'Payment failures',
    },
  ]

  const toggleIssue = (index: number) => {
    if (expandedIssue === index) {
      setExpandedIssue(null)
    } else {
      setExpandedIssue(index)
    }
  }

  const goBack = () => {
    setActiveSection('main')
    setExpandedIssue(null)
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div
        className="bg-blue-darkest border border-divider/20 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center p-6 border-b border-divider/10">
          <div className="flex items-center gap-3">
            <HelpCircle className="w-6 h-6 text-cyan" />
            <h2 className="text-xl font-bold text-white">
              {activeSection === 'main'
                ? 'Support & Resources'
                : activeSection === 'troubleshoot'
                  ? 'Troubleshooting'
                  : 'Support'}
            </h2>
          </div>
          <button
            aria-label="Close modal"
            className="p-2 text-gray-400 hover:text-white hover:bg-blue-darker/70 rounded-lg transition-colors"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {activeSection === 'main' && (
            <div className="space-y-6">
              <p className="text-gray-300">
                Need help with KaleidoSwap? Here are several ways to get
                assistance:
              </p>

              {/* Support Options */}
              <div className="grid gap-4">
                {/* Documentation */}
                <div
                  className="bg-blue-darker/50 border border-divider/20 rounded-xl p-4 cursor-pointer hover:bg-blue-dark/30 transition-all duration-200 hover:-translate-y-1 group"
                  onClick={() =>
                    openExternalLink('https://docs.kaleidoswap.com')
                  }
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-dark/80 rounded-lg text-cyan">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">
                        Documentation
                      </h3>
                      <p className="text-sm text-gray-400">
                        Comprehensive guides and tutorials
                      </p>
                    </div>
                    <ExternalLink className="w-5 h-5 text-cyan opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                {/* FAQ */}
                <div
                  className="bg-blue-darker/50 border border-divider/20 rounded-xl p-4 cursor-pointer hover:bg-blue-dark/30 transition-all duration-200 hover:-translate-y-1 group"
                  onClick={() =>
                    openExternalLink(
                      'https://docs.kaleidoswap.com/desktop-app/faq'
                    )
                  }
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-dark/80 rounded-lg text-cyan">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">
                        Frequently Asked Questions
                      </h3>
                      <p className="text-sm text-gray-400">
                        Find answers to common questions
                      </p>
                    </div>
                    <ExternalLink className="w-5 h-5 text-cyan opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                {/* Telegram */}
                <div
                  className="bg-blue-darker/50 border border-divider/20 rounded-xl p-4 cursor-pointer hover:bg-blue-dark/30 transition-all duration-200 hover:-translate-y-1 group"
                  onClick={() => openExternalLink('https://t.me/kaleidoswap')}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-dark/80 rounded-lg text-cyan">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">
                        Telegram Group
                      </h3>
                      <p className="text-sm text-gray-400">
                        Join our community for support and discussion
                      </p>
                    </div>
                    <ExternalLink className="w-5 h-5 text-cyan opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                {/* GitHub */}
                <div
                  className="bg-blue-darker/50 border border-divider/20 rounded-xl p-4 cursor-pointer hover:bg-blue-dark/30 transition-all duration-200 hover:-translate-y-1 group"
                  onClick={() =>
                    openExternalLink(
                      'https://github.com/kaleidoswap/desktop-app'
                    )
                  }
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-dark/80 rounded-lg text-cyan">
                      <Github className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">
                        GitHub Issues
                      </h3>
                      <p className="text-sm text-gray-400">
                        Report bugs or request new features
                      </p>
                    </div>
                    <ExternalLink className="w-5 h-5 text-cyan opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                {/* Troubleshooting */}
                <div
                  className="bg-gradient-to-br from-cyan/10 to-transparent border-2 border-cyan/20 rounded-xl p-4 cursor-pointer hover:bg-cyan/5 transition-all duration-200 hover:-translate-y-1 group"
                  onClick={() => setActiveSection('troubleshoot')}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-dark/80 rounded-lg text-cyan">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">
                        Common Issues & Solutions
                      </h3>
                      <p className="text-sm text-gray-400">
                        Quick troubleshooting for common problems
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-cyan opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'troubleshoot' && (
            <div className="space-y-5">
              <button
                className="flex items-center gap-2 text-cyan hover:underline mb-4"
                onClick={goBack}
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                <span>Back to Support Options</span>
              </button>

              <p className="text-gray-300 mb-4">
                Here are some common issues and their solutions. If your issue
                isn't listed here, please contact us through one of the support
                channels.
              </p>

              <div className="space-y-4">
                {COMMON_ISSUES.map((issue, index) => (
                  <div
                    className="bg-blue-darker/50 rounded-xl border border-divider/20 overflow-hidden"
                    key={index}
                  >
                    <div
                      className="p-5 flex justify-between items-center cursor-pointer hover:bg-blue-dark/30 transition-colors"
                      onClick={() => toggleIssue(index)}
                    >
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-cyan" />
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            {issue.title}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {issue.description}
                          </p>
                        </div>
                      </div>
                      <button className="p-1 text-gray-400 hover:text-white transition-colors">
                        {expandedIssue === index ? (
                          <X className="w-5 h-5" />
                        ) : (
                          <span className="text-cyan">View Solutions</span>
                        )}
                      </button>
                    </div>

                    {expandedIssue === index && (
                      <div className="px-5 pb-5 pt-2 border-t border-divider/20 bg-blue-darkest/30">
                        <h4 className="text-sm font-semibold text-cyan mb-3">
                          Solutions:
                        </h4>
                        <ul className="space-y-2">
                          {issue.solutions.map((solution, sIndex) => (
                            <li
                              className="flex items-start gap-2 text-gray-300"
                              key={sIndex}
                            >
                              <CheckCircle className="w-4 h-4 text-cyan mt-1 flex-shrink-0" />
                              <span>{solution}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-5 bg-blue-darker/30 rounded-xl mt-4 border border-divider/20">
                <p className="text-gray-300 mb-4">
                  Still having issues? Get personalized help from our community
                  and developers:
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    className="px-4 py-2 bg-blue-dark text-cyan rounded-lg hover:bg-blue-dark/80 transition-colors flex items-center gap-2 text-sm"
                    onClick={() => openExternalLink('https://t.me/kaleidoswap')}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Telegram Support
                  </button>
                  <button
                    className="px-4 py-2 bg-blue-dark text-cyan rounded-lg hover:bg-blue-dark/80 transition-colors flex items-center gap-2 text-sm"
                    onClick={() =>
                      openExternalLink(
                        'https://github.com/kaleidoswap/desktop-app/issues'
                      )
                    }
                  >
                    <Github className="w-4 h-4" />
                    Report an Issue
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-divider/10 bg-blue-darkest">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="text-sm text-gray-400">
              Need more help?{' '}
              <button
                className="text-cyan hover:underline"
                onClick={() => {
                  openUrl('mailto:support@kaleidoswap.com')
                }}
              >
                support@kaleidoswap.com
              </button>
            </div>
            <div className="flex gap-3">
              <button
                className="px-4 py-2 bg-blue-dark/60 text-white rounded-lg hover:bg-blue-dark/80 transition-colors"
                onClick={onClose}
              >
                Close
              </button>
              {activeSection !== 'main' && (
                <button
                  className="px-4 py-2 bg-cyan/20 text-cyan rounded-lg hover:bg-cyan/30 transition-colors"
                  onClick={goBack}
                >
                  Back
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const SupportButton = ({ onClick }: SupportButtonProps) => {
  return (
    <button
      aria-label="Get Support"
      className="flex items-center gap-2 px-4 py-2 bg-blue-darker hover:bg-blue-dark text-white rounded-lg transition-colors"
      onClick={onClick}
    >
      <HelpCircle className="w-5 h-5 text-cyan" />
      <span>Support</span>
    </button>
  )
}
